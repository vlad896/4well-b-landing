/* <dim-carousel> — shared horizontal carousel infrastructure.
   Lazy-init via IntersectionObserver (rootMargin 200px).
   CSS scroll-snap handles touch swipe (zero JS for gestures).
   Active card detection via scroll handler + getBoundingClientRect.
   ARIA: parent .carousel-track has role="region" aria-roledescription="carousel".
   Honors prefers-reduced-motion (behavior:'auto' instead of 'smooth').
   No autoplay, no clone-loop — predictable and accessible by design.

   Markup contract:
     <dim-carousel start-index="0" intercept-inactive-click="true">
       <button data-prev aria-label="...">‹</button>
       <div class="carousel-track" tabindex="0" role="region"
            aria-roledescription="carousel" aria-label="...">
         <article class="carousel-card" aria-current="true">...</article>
         <article class="carousel-card" aria-current="false">...</article>
         ...
       </div>
       <button data-next aria-label="...">›</button>
       <div data-scrubber-bar></div>  <!-- optional -->
     </dim-carousel>

   Target <= 3KB minified. */
(() => {
  if (customElements.get('dim-carousel')) return;

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class DimCarousel extends HTMLElement {
    connectedCallback() {
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            io.disconnect();
            this._init();
          }
        }, { rootMargin: '200px' });
        io.observe(this);
      } else {
        this._init();
      }
    }

    _init() {
      this.track = this.querySelector('.carousel-track');
      if (!this.track) return;
      this.cards = Array.from(this.track.children);
      if (!this.cards.length) return;

      this.prevBtn = this.querySelector('[data-prev]');
      this.nextBtn = this.querySelector('[data-next]');
      this.scrubberBar = this.querySelector('[data-scrubber-bar]');
      this.intercept = this.getAttribute('intercept-inactive-click') !== 'false';
      this._activeIdx = -1;
      this._raf = 0;

      if (this.prevBtn) this.prevBtn.addEventListener('click', () => this._scrollToIdx(this._activeIdx - 1));
      if (this.nextBtn) this.nextBtn.addEventListener('click', () => this._scrollToIdx(this._activeIdx + 1));

      this.track.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); this._scrollToIdx(this._activeIdx - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); this._scrollToIdx(this._activeIdx + 1); }
      });

      this.track.addEventListener('scroll', () => {
        if (this._raf) cancelAnimationFrame(this._raf);
        this._raf = requestAnimationFrame(() => this._updateActive());
      }, { passive: true });

      if (this.intercept) {
        this.track.addEventListener('click', (e) => {
          const card = this.cards.find(c => c === e.target || c.contains(e.target));
          if (!card) return;
          const idx = this.cards.indexOf(card);
          if (idx >= 0 && idx !== this._activeIdx) {
            e.preventDefault();
            e.stopImmediatePropagation();
            this._scrollToIdx(idx);
          }
        }, true);
      }

      const startIdx = parseInt(this.getAttribute('start-index') || '0', 10);
      requestAnimationFrame(() => {
        if (startIdx > 0) this._scrollToIdx(startIdx, true);
        else this._updateActive();
      });
    }

    _scrollToIdx(idx, instant) {
      const clamped = Math.max(0, Math.min(this.cards.length - 1, idx));
      const card = this.cards[clamped];
      if (!card) return;
      const trackRect = this.track.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const dx = (cardRect.left + cardRect.width / 2) - (trackRect.left + trackRect.width / 2);
      const behavior = (instant || reduced()) ? 'auto' : 'smooth';
      this.track.scrollBy({ left: dx, behavior });
    }

    _updateActive() {
      const trackRect = this.track.getBoundingClientRect();
      const center = trackRect.left + trackRect.width / 2;
      let best = 0, bestDist = Infinity;
      this.cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.abs(center - (r.left + r.width / 2));
        if (d < bestDist) { bestDist = d; best = i; }
      });
      this._setActive(best);
    }

    _setActive(idx) {
      if (idx === this._activeIdx) return;
      this._activeIdx = idx;
      this.cards.forEach((c, i) => {
        const active = (i === idx);
        c.classList.toggle('is-active', active);
        c.setAttribute('aria-current', active ? 'true' : 'false');
      });
      if (this.prevBtn) this.prevBtn.disabled = (idx === 0);
      if (this.nextBtn) this.nextBtn.disabled = (idx === this.cards.length - 1);
      if (this.scrubberBar) {
        const pct = ((idx + 1) / this.cards.length) * 100;
        this.scrubberBar.style.width = pct + '%';
      }
    }
  }
  customElements.define('dim-carousel', DimCarousel);
})();
