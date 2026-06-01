/* <dim-countdown> — daily-rolling sale-countdown web component (OI5-fixed).

   Markup contract:
     <dim-countdown end-date="" fallback-hours="24" persist-key="..."
                    expired-action="label|hide" expired-label="..."
                    aria-under-minute="..." aria-under-5-min="..."
                    aria-under-30-min="..." aria-under-1-hour="..."
                    aria-hours-remaining="{count} hours remaining">
       <strong data-clock aria-hidden="true">--:--:--</strong>
       <span class="visually-hidden" data-clock-sr aria-live="polite"></span>
     </dim-countdown>

   Behavior:
     - Visual [data-clock] ticks every second (hidden from SR via aria-hidden).
     - Screen-reader [data-clock-sr] announces ONLY when minute-bucket changes,
       not every second (OI5 fix from Turn 19). Buckets:
         < 1 min       -> aria-under-minute
         < 5 min       -> aria-under-5-min
         < 30 min      -> aria-under-30-min
         < 1 hour      -> aria-under-1-hour
         >= 1 hour     -> aria-hours-remaining with {count} replaced by integer hours
     - end-date ISO (set in schema)  -> absolute countdown to that moment for all visitors.
     - end-date blank (default)      -> daily-rolling: end = start-of-today + fallback-hours
       (local TZ). Default 24h -> ends at next local midnight; automatically rolls
       over each day at 00:00 with no localStorage involvement.
     - persist-key attribute is accepted for forward compatibility but unused in
       daily-rolling mode (no per-visitor anchor needed).
   Target <= 2KB minified. */
(() => {
  if (customElements.get('dim-countdown')) return;

  class DimCountdown extends HTMLElement {
    connectedCallback() {
      this.clock = this.querySelector('[data-clock]');
      if (!this.clock) return;
      this.clockSr = this.querySelector('[data-clock-sr]');
      this.endTime = this._resolveEnd();
      this._lastBucket = null;
      this._tick();
      this.intervalId = setInterval(() => this._tick(), 1000);
    }
    disconnectedCallback() {
      if (this.intervalId) clearInterval(this.intervalId);
    }
    _resolveEnd() {
      const iso = this.getAttribute('end-date');
      if (iso) {
        const t = Date.parse(iso);
        if (!isNaN(t)) return t;
      }
      // Daily-rolling fallback: anchor at start of today (local midnight).
      // End = todayStart + fallback-hours. Default 24h -> ends at tomorrow midnight.
      // Automatically resets every day at 00:00; no localStorage involvement.
      const hours = parseFloat(this.getAttribute('fallback-hours') || '24');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return todayStart.getTime() + hours * 3600000;
    }
    _tick() {
      const ms = this.endTime - Date.now();
      if (ms <= 0) { this._expire(); return; }
      const p = n => String(n).padStart(2, '0');
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      this.clock.textContent = p(h) + ':' + p(m) + ':' + p(s);

      // OI5: announce only on minute-bucket transition, not every second
      if (this.clockSr) {
        const bucket = this._bucket(ms);
        if (bucket !== this._lastBucket) {
          this._lastBucket = bucket;
          this.clockSr.textContent = this._humanize(ms, h);
        }
      }
    }
    _bucket(ms) {
      // Unique value per minute-tier so SR text only updates on transitions.
      if (ms < 60000)        return 'm-1';
      if (ms < 5 * 60000)    return 'm-5';
      if (ms < 30 * 60000)   return 'm-30';
      if (ms < 3600000)      return 'h-1';
      return 'h-' + Math.floor(ms / 3600000);
    }
    _humanize(ms, h) {
      if (ms < 60000)      return this.getAttribute('aria-under-minute') || 'Less than 1 minute remaining';
      if (ms < 5 * 60000)  return this.getAttribute('aria-under-5-min')  || 'Less than 5 minutes remaining';
      if (ms < 30 * 60000) return this.getAttribute('aria-under-30-min') || 'Less than 30 minutes remaining';
      if (ms < 3600000)    return this.getAttribute('aria-under-1-hour') || 'Less than 1 hour remaining';
      const tpl = this.getAttribute('aria-hours-remaining') || '{count} hours remaining';
      return tpl.replace('{count}', String(h));
    }
    _expire() {
      if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
      const action = this.getAttribute('expired-action') || 'label';
      const label = this.getAttribute('expired-label') || 'Offer ended';
      if (action === 'hide') {
        this.hidden = true;
      } else {
        this.clock.textContent = label;
      }
      if (this.clockSr) this.clockSr.textContent = label;
    }
  }
  customElements.define('dim-countdown', DimCountdown);
})();
