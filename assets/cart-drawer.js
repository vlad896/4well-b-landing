/* <cart-drawer> — slide-out cart panel (design phase).
   Open:  any [data-cart-drawer-open] click.
   Close: overlay / [data-cart-drawer-close] / Escape.
   Scroll lock + focus restore follow the dim-video-modal pattern.
   Quantity steppers are client-side only for now (no /cart/change.js yet). */
(() => {
  if (customElements.get('cart-drawer')) return;

  class CartDrawer extends HTMLElement {
    connectedCallback() {
      this._lastFocus = null;
      this._panel = this.querySelector('.cart-drawer__panel');

      document.querySelectorAll('[data-cart-drawer-open]').forEach((trigger) => {
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          this.open(trigger);
        });
      });

      this.addEventListener('click', (e) => {
        if (e.target.closest('[data-cart-drawer-close]')) this.close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.hasAttribute('hidden')) this.close();
      });

      this._wireQty();
    }

    open(trigger) {
      this._lastFocus = trigger || document.activeElement;
      this.removeAttribute('hidden');
      // double rAF: let the browser paint hidden→visible before the transition starts
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.classList.add('is-open'));
      });
      document.documentElement.style.overflow = 'hidden';
      if (this._panel) this._panel.focus();
    }

    close() {
      this.classList.remove('is-open');
      document.documentElement.style.overflow = '';
      const onEnd = (e) => {
        if (e.target !== this._panel) return;
        this.setAttribute('hidden', '');
        this._panel.removeEventListener('transitionend', onEnd);
      };
      if (this._panel) {
        this._panel.addEventListener('transitionend', onEnd);
        // fallback when transitions are disabled (prefers-reduced-motion)
        setTimeout(() => this.setAttribute('hidden', ''), 400);
      } else {
        this.setAttribute('hidden', '');
      }
      if (this._lastFocus && this._lastFocus.focus) this._lastFocus.focus();
    }

    _wireQty() {
      this.querySelectorAll('[data-qty]').forEach((qty) => {
        const input = qty.querySelector('input');
        qty.addEventListener('click', (e) => {
          if (e.target.closest('[data-qty-plus]')) input.value = +input.value + 1;
          if (e.target.closest('[data-qty-minus]')) input.value = Math.max(0, +input.value - 1);
        });
      });
    }
  }

  customElements.define('cart-drawer', CartDrawer);
})();
