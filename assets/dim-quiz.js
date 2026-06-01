/* <dim-quiz> — 4-question wizard with progress bar + outcome-routed result.
   Lazy-init via IntersectionObserver (no JS work until scrolled near).
   localStorage answer save (reload preserves progress).
   Q1 answer drives result-card selection. CTA href gets ?utm_content=quiz-{outcome}.
   Markup contract:
     <dim-quiz persist-key="dim-quiz-v1">
       <div class="quiz__progress">
         <div class="quiz__progress-bar" data-quiz-bar role="progressbar" ...></div>
       </div>
       <div class="quiz__step" data-step="1">
         <h3 class="quiz__q">...</h3>
         <div class="quiz__opts">
           <button class="quiz__opt" type="button" data-val="cyclical">...</button>
           ...
         </div>
       </div>
       ... more quiz__step blocks ...
       <div class="quiz__step quiz__result" data-outcome="cyclical" hidden>...</div>
       <div class="quiz__step quiz__result" data-outcome="constant" hidden>...</div>
       <div class="quiz__step quiz__result" data-outcome="_default" hidden>...</div>
     </dim-quiz>
   Target <= 4KB minified. */
(() => {
  if (customElements.get('dim-quiz')) return;

  class DimQuiz extends HTMLElement {
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
      this.questionSteps = Array.from(this.querySelectorAll('.quiz__step:not(.quiz__result)'));
      this.resultSteps = Array.from(this.querySelectorAll('.quiz__result'));
      this.defaultResult = this.querySelector('.quiz__result[data-outcome="_default"]');
      this.bar = this.querySelector('[data-quiz-bar]');
      this.total = this.questionSteps.length;
      if (!this.total) return;
      this.answers = this._load();
      this.currentIdx = 0;
      this._render();
      this.addEventListener('click', (e) => {
        const opt = e.target.closest('.quiz__opt');
        if (opt) this._answer(opt);
      });
    }
    _key() {
      return this.getAttribute('persist-key') || 'dim-quiz';
    }
    _load() {
      try {
        const raw = localStorage.getItem(this._key());
        if (raw) {
          const data = JSON.parse(raw);
          if (data && typeof data === 'object') return data;
        }
      } catch (_) {}
      return {};
    }
    _save() {
      try { localStorage.setItem(this._key(), JSON.stringify(this.answers)); } catch (_) {}
    }
    _answer(opt) {
      const siblings = opt.parentElement ? opt.parentElement.querySelectorAll('.quiz__opt') : [];
      siblings.forEach(b => { b.classList.remove('is-selected'); b.disabled = true; });
      opt.classList.add('is-selected');
      this.answers['q' + (this.currentIdx + 1)] = opt.dataset.val || '';
      this._save();
      setTimeout(() => {
        siblings.forEach(b => { b.disabled = false; b.classList.remove('is-selected'); });
        if (this.currentIdx < this.total - 1) {
          this.currentIdx++;
          this._render();
        } else {
          this._showResult();
        }
      }, 280);
    }
    _render() {
      this.questionSteps.forEach((s, i) => { s.hidden = (i !== this.currentIdx); });
      this.resultSteps.forEach((r) => { r.hidden = true; });
      if (this.bar) {
        const pct = Math.round(((this.currentIdx + 1) / this.total) * 100);
        this.bar.style.width = pct + '%';
        this.bar.setAttribute('aria-valuenow', String(pct));
      }
    }
    _resolveOutcome() {
      const q1 = this.answers.q1 || '';
      const match = this.resultSteps.find(r => r.getAttribute('data-outcome') === q1);
      return match || this.defaultResult || this.resultSteps[0] || null;
    }
    _stampUtm(card, outcome) {
      const link = card.querySelector('a[href]');
      if (!link) return;
      try {
        const url = new URL(link.getAttribute('href'), window.location.href);
        url.searchParams.set('utm_content', 'quiz-' + outcome);
        link.setAttribute('href', url.toString());
      } catch (_) { /* malformed URL — leave as-is */ }
    }
    _showResult() {
      this.questionSteps.forEach((s) => { s.hidden = true; });
      this.resultSteps.forEach((r) => { r.hidden = true; });
      const card = this._resolveOutcome();
      if (card) {
        card.hidden = false;
        const outcome = card.getAttribute('data-outcome') || 'unknown';
        if (outcome !== '_default') this._stampUtm(card, outcome);
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const rect = card.getBoundingClientRect();
        if (rect.top < 80 || rect.bottom > window.innerHeight) {
          card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        }
      }
      if (this.bar) {
        this.bar.style.width = '100%';
        this.bar.setAttribute('aria-valuenow', '100');
      }
      this.dispatchEvent(new CustomEvent('quiz-complete', {
        bubbles: true,
        detail: { answers: this.answers, outcome: card ? card.getAttribute('data-outcome') : null }
      }));
    }
  }
  customElements.define('dim-quiz', DimQuiz);
})();
