/* <dim-video-modal> — lazy <video> loader on tile click.
   ESC + backdrop close, focus management, body-scroll lock.

   LAZY REGISTRATION (Phase 1 amendment C):
     Module is loaded only when at least one [data-video-src] with non-empty
     value exists on the page. Loading is gated by the section's Liquid:

       {% if has_real_videos %}
         <script src="dim-video-modal.js" type="module" defer></script>
       {% endif %}

     In v1 (all blocks have video_src_url=""), the section omits the script
     tag entirely → module never downloaded → ~1.5 KB JS saved over the wire.
     Belt-and-braces: module ALSO self-guards at top (return early if no triggers).

   Markup contract (rendered when has_real_videos == true):
     <button data-video-src="..." data-video-type="video/mp4">tile</button>
     <dim-video-modal id="video-modal" hidden role="dialog" aria-modal="true" aria-label="...">
       <div class="modal__backdrop" data-close-modal></div>
       <div class="modal__card modal__card--video">
         <button class="modal__close" data-close-modal aria-label="Close">×</button>
         <video controls preload="none" playsinline></video>
         <p class="video-modal__legal">{compliance.video_modal_legal}</p>
       </div>
     </dim-video-modal>

   Target <= 1.5KB minified. */
(() => {
  // Self-guard: no triggers on page → no work.
  const triggers = document.querySelectorAll('[data-video-src]:not([data-video-src=""])');
  if (!triggers.length) return;
  if (customElements.get('dim-video-modal')) return;

  class DimVideoModal extends HTMLElement {
    connectedCallback() {
      this._lastFocus = null;
      this._wireTriggers();
      this._wireClose();
    }

    _wireTriggers() {
      triggers.forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          this._lastFocus = trigger;
          this._open(trigger.dataset.videoSrc, trigger.dataset.videoType || 'video/mp4');
        });
      });
    }

    _wireClose() {
      this.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-modal]')) this._close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.hasAttribute('hidden')) this._close();
      });
    }

    _open(src, type) {
      const video = this.querySelector('video');
      if (video) {
        // Replace any existing <source> children.
        video.querySelectorAll('source').forEach(s => s.remove());
        const source = document.createElement('source');
        source.src = src;
        source.type = type;
        video.appendChild(source);
        video.load();
      }
      this.removeAttribute('hidden');
      document.documentElement.style.overflow = 'hidden';
      const closeBtn = this.querySelector('[data-close-modal]:not(.modal__backdrop)');
      if (closeBtn && closeBtn.focus) closeBtn.focus();
      if (video) video.play().catch(() => {});
    }

    _close() {
      this.setAttribute('hidden', '');
      document.documentElement.style.overflow = '';
      const video = this.querySelector('video');
      if (video) {
        video.pause();
        video.querySelectorAll('source').forEach(s => s.remove());
        video.removeAttribute('src');
        video.load();
      }
      if (this._lastFocus && this._lastFocus.focus) this._lastFocus.focus();
    }
  }
  customElements.define('dim-video-modal', DimVideoModal);
})();
