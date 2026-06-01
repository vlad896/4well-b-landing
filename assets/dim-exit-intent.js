/* <dim-exit-intent> — exit-intent modal trigger with one-shot session guard.

   Markup contract:
     <dim-exit-intent dwell-desktop="8" dwell-mobile="30" persist-key="..."
                      role="dialog" aria-modal="true" aria-labelledby="..."
                      [editor-preview] hidden>
       <div data-close-modal></div>          <!-- backdrop -->
       <div ...>                              <!-- card with form + dismiss btn -->
         ...nested <dim-email-optin>...
         <button data-close-modal>×</button>
       </div>
     </dim-exit-intent>

   Triggers:
   - Desktop: document mouseleave with clientY <= 10 AND dwell >= dwell-desktop seconds
   - Mobile : dwell >= dwell-mobile seconds AND fast scroll-up (dy < -100, dt < 300ms, scrollY < 200)
   - sessionStorage[persist-key] one-shot: skip ALL trigger logic if already set
   - editor-preview attribute: skip sessionStorage check (always show in theme editor)

   Show behavior:
   - removeAttribute hidden
   - lock body scroll
   - focus first focusable inside (close button, email input, etc.)
   - track lastFocused for restore on close

   Close behavior:
   - setAttribute hidden, unlock body scroll
   - restore focus to lastFocused
   - sessionStorage flag set both on show AND close (defensive idempotent)
   - listens for email-optin-success → auto-close after 2.5s

   Focus trap: Tab from last focusable → first; Shift+Tab from first → last.
   ESC closes. Backdrop click closes. Dismiss button closes.

   Lazy init: requestIdleCallback (low priority — not on critical path).

   Target <= 2KB minified. */
(() => {
  if (customElements.get('dim-exit-intent')) return;

  const FOCUSABLE = 'button, [href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])';

  class DimExitIntent extends HTMLElement {
    connectedCallback() {
      const cb = () => this._init();
      if ('requestIdleCallback' in window) {
        requestIdleCallback(cb, { timeout: 4000 });
      } else {
        setTimeout(cb, 2000);
      }
    }

    _init() {
      this.persistKey = this.getAttribute('persist-key') || 'dim-exit-popup-shown-v1';
      this.editorPreview = this.hasAttribute('editor-preview');

      if (!this.editorPreview) {
        try { if (sessionStorage.getItem(this.persistKey)) return; } catch (_) {}
      }

      this.dwellDesktop = parseInt(this.getAttribute('dwell-desktop') || '8', 10) * 1000;
      this.dwellMobile  = parseInt(this.getAttribute('dwell-mobile')  || '30', 10) * 1000;
      this._pageLoadedAt = Date.now();
      this._lastFocused = null;
      this._shown = false;

      this._mouseLeaveHandler = (e) => {
        if (e.clientY > 10) return;
        if (Date.now() - this._pageLoadedAt < this.dwellDesktop) return;
        this._show();
      };
      document.addEventListener('mouseleave', this._mouseLeaveHandler);

      let lastY = window.scrollY, lastT = Date.now();
      this._scrollHandler = () => {
        if (Date.now() - this._pageLoadedAt < this.dwellMobile) return;
        const now = Date.now();
        const dy = window.scrollY - lastY;
        const dt = now - lastT;
        if (dy < -100 && dt < 300 && window.scrollY < 200) {
          this._show();
        }
        lastY = window.scrollY;
        lastT = now;
      };
      window.addEventListener('scroll', this._scrollHandler, { passive: true });

      this._keyHandler = (e) => {
        if (!this._shown) return;
        if (e.key === 'Escape') { e.preventDefault(); this._close(); return; }
        if (e.key === 'Tab') this._trapFocus(e);
      };
      document.addEventListener('keydown', this._keyHandler);

      this.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-modal]')) this._close();
      });

      // Auto-close shortly after successful email submission
      this.addEventListener('email-optin-success', () => {
        setTimeout(() => this._close(), 2500);
      });
    }

    _show() {
      if (this._shown) return;
      if (!this.editorPreview) {
        try { if (sessionStorage.getItem(this.persistKey)) return; } catch (_) {}
      }
      this._shown = true;
      try { sessionStorage.setItem(this.persistKey, '1'); } catch (_) {}
      this._lastFocused = document.activeElement;
      this.removeAttribute('hidden');
      document.documentElement.style.overflow = 'hidden';
      const first = this.querySelector(FOCUSABLE);
      if (first && first.focus) first.focus();
      this.dispatchEvent(new CustomEvent('exit-intent-shown', { bubbles: true }));
    }

    _close() {
      if (!this._shown) return;
      this._shown = false;
      try { sessionStorage.setItem(this.persistKey, '1'); } catch (_) {}
      this.setAttribute('hidden', '');
      document.documentElement.style.overflow = '';
      if (this._lastFocused && this._lastFocused.focus) this._lastFocused.focus();
      if (!this.editorPreview) this._teardownTriggers();
    }

    _teardownTriggers() {
      if (this._mouseLeaveHandler) {
        document.removeEventListener('mouseleave', this._mouseLeaveHandler);
        this._mouseLeaveHandler = null;
      }
      if (this._scrollHandler) {
        window.removeEventListener('scroll', this._scrollHandler);
        this._scrollHandler = null;
      }
    }

    _trapFocus(e) {
      const focusables = this.querySelectorAll(FOCUSABLE);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    disconnectedCallback() {
      if (this._mouseLeaveHandler) document.removeEventListener('mouseleave', this._mouseLeaveHandler);
      if (this._scrollHandler)     window.removeEventListener('scroll', this._scrollHandler);
      if (this._keyHandler)        document.removeEventListener('keydown', this._keyHandler);
    }
  }

  customElements.define('dim-exit-intent', DimExitIntent);
})();
