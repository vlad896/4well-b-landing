/* <dim-accordion> — single-open enforcement for native <details>.

   Markup uses native <details>/<summary> + richtext answer div.
   FAQ open/close WORKS WITHOUT JS (native browser behavior).
   This component adds OPTIONAL single-open behavior when `single-open` attribute is set:
   when any <details> opens, programmatically close its siblings.

   Smooth height animation was specified in MIGRATION_PLAN §7 but DEFERRED:
   the grid-template-rows: 0fr → 1fr technique requires CSS interpolate-size:
   allow-keywords (Chrome 129+, not yet universal in Safari/Firefox stable).
   Forcing display:block on <details> children to keep them in flow when
   closed would break the no-JS fallback. Trade-off: instant show/hide + CSS
   plus/minus icon swap via [open] selector for visual feedback.

   Lazy init via IntersectionObserver (rootMargin 200px) consistent with
   dim-carousel + dim-quiz pattern.

   Target <= 1KB minified. */
(() => {
  if (customElements.get('dim-accordion')) return;

  class DimAccordion extends HTMLElement {
    connectedCallback() {
      // Without single-open, no JS work needed — pure CSS handles everything.
      if (!this.hasAttribute('single-open')) return;

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
      this.items = Array.from(this.querySelectorAll('details'));
      if (!this.items.length) return;
      this.items.forEach((d) => {
        d.addEventListener('toggle', () => {
          if (d.open) {
            this.items.forEach((other) => {
              if (other !== d && other.open) other.open = false;
            });
          }
        });
      });
    }
  }
  customElements.define('dim-accordion', DimAccordion);
})();
