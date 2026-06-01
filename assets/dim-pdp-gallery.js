/* <dim-pdp-gallery> — PDP-style product gallery.
   Click thumbnail → swap main image.
   Click main image → open <dialog> lightbox with full-res image.
   Native <dialog> + ESC + backdrop click for close.
   Keyboard: thumb buttons are real <button role="tab"> (focusable, Enter/Space work natively).

   Markup contract:
     <dim-pdp-gallery>
       <div data-pdp-main role="button" tabindex="0">
         <img data-pdp-main-img src="..." alt="...">
       </div>
       <ul role="tablist">
         <li><button role="tab" data-pdp-thumb data-full="..." data-alt="..." aria-selected="true"><img src=".../thumb"></button></li>
         ...
       </ul>
       <dialog data-pdp-zoom>
         <button data-pdp-zoom-close>×</button>
         <div class="pdp-gallery__zoom-scroll"><img data-pdp-zoom-img></div>
       </dialog>
     </dim-pdp-gallery> */
(() => {
  if (customElements.get('dim-pdp-gallery')) return;

  class DimPdpGallery extends HTMLElement {
    connectedCallback() {
      this.mainEl    = this.querySelector('[data-pdp-main]');
      this.mainImg   = this.querySelector('[data-pdp-main-img]');
      this.thumbs    = Array.from(this.querySelectorAll('[data-pdp-thumb]'));
      this.dialog    = this.querySelector('[data-pdp-zoom]');
      this.zoomImg   = this.querySelector('[data-pdp-zoom-img]');
      this.closeBtn  = this.querySelector('[data-pdp-zoom-close]');

      if (!this.mainEl || !this.mainImg) return;

      this.thumbs.forEach((btn, i) => {
        btn.addEventListener('click', () => this.select(i));
      });

      this.mainEl.addEventListener('click', () => this.openZoom());
      this.mainEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openZoom();
        }
      });

      if (this.dialog) {
        this.closeBtn?.addEventListener('click', () => this.dialog.close());
        this.dialog.addEventListener('click', (e) => {
          if (e.target === this.dialog) this.dialog.close();
        });
      }
    }

    select(i) {
      const btn = this.thumbs[i];
      if (!btn) return;
      const full = btn.getAttribute('data-full');
      const alt  = btn.getAttribute('data-alt') || '';
      if (!full) return;

      this.mainImg.src = full;
      this.mainImg.alt = alt;
      this.mainImg.removeAttribute('srcset');
      this.mainImg.removeAttribute('sizes');

      this.thumbs.forEach((t) => {
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('aria-current', 'false');
      });
      btn.setAttribute('aria-selected', 'true');
      btn.setAttribute('aria-current', 'true');
    }

    openZoom() {
      if (!this.dialog || !this.zoomImg) return;
      this.zoomImg.src = this.mainImg.src;
      this.zoomImg.alt = this.mainImg.alt;
      if (typeof this.dialog.showModal === 'function') {
        this.dialog.showModal();
      } else {
        this.dialog.setAttribute('open', '');
      }
    }
  }

  customElements.define('dim-pdp-gallery', DimPdpGallery);
})();
