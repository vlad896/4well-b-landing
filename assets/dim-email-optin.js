/* <dim-email-optin> — Klaviyo lead magnet form submission with honeypot bot detection.

   Klaviyo endpoint: https://manage.kmail-lists.com/ajax/subscriptions/subscribe
   POST application/x-www-form-urlencoded with fields:
     g          (list ID)
     email      (user input)
     $consent   ("web")
     $source    (section identifier for tracking)

   Behavior:
   - HTML5 native validation first; on failure, set aria-invalid + focus input.
   - Honeypot: if hidden `phone` field is filled → silent "success" (no Klaviyo POST).
   - On real submit: fetch POST, hide form on success, move focus to success message.
   - No-JS fallback: form `action` is the Klaviyo URL → native submit fires.
   - prefers-reduced-motion: no animations in this WC; nothing to disable.

   Target <= 1.5KB minified. */
(() => {
  if (customElements.get('dim-email-optin')) return;

  class DimEmailOptin extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      if (!this.form) return;
      this.successEl = this.querySelector('[data-success]');
      this.errorEl = this.querySelector('[data-error]');
      this.honeypot = this.form.querySelector('input[name="phone"]');
      this.emailInput = this.form.querySelector('input[type="email"]');
      this.submitBtn = this.form.querySelector('button[type="submit"]');
      this.originalBtnText = this.submitBtn ? this.submitBtn.textContent : '';
      this.successText = this.getAttribute('success-text') || 'Check your inbox.';
      this.errorText = this.getAttribute('error-text') || 'Something went wrong. Please try again.';
      this.loadingText = this.getAttribute('loading-text') || 'Sending…';
      this.endpoint = this.getAttribute('endpoint') || this.form.action;
      this.form.addEventListener('submit', (e) => this._onSubmit(e));
    }

    async _onSubmit(e) {
      e.preventDefault();

      // Honeypot — naive bots fill any field; humans don't see this one.
      if (this.honeypot && this.honeypot.value) {
        this._showSuccess();
        return;
      }

      if (!this.form.checkValidity()) {
        if (this.emailInput) {
          this.emailInput.setAttribute('aria-invalid', 'true');
          this.emailInput.focus();
        }
        return;
      }
      if (this.emailInput) this.emailInput.removeAttribute('aria-invalid');

      this._showLoading();

      try {
        const formData = new FormData(this.form);
        const body = new URLSearchParams(formData).toString();
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.success === true || data.success === undefined)) {
          this._showSuccess();
        } else {
          this._showError();
        }
      } catch (_) {
        this._showError();
      }
    }

    _showLoading() {
      if (this.submitBtn) {
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = this.loadingText;
      }
      if (this.errorEl) this.errorEl.hidden = true;
    }

    _showSuccess() {
      this.form.hidden = true;
      if (this.errorEl) this.errorEl.hidden = true;
      if (this.successEl) {
        this.successEl.textContent = this.successText;
        this.successEl.hidden = false;
        this.successEl.setAttribute('tabindex', '-1');
        this.successEl.focus({ preventScroll: false });
      }
      this.dispatchEvent(new CustomEvent('email-optin-success', {
        bubbles: true,
        detail: { source: this.getAttribute('source') || '' }
      }));
    }

    _showError() {
      if (this.submitBtn) {
        this.submitBtn.disabled = false;
        this.submitBtn.textContent = this.originalBtnText;
      }
      if (this.errorEl) {
        this.errorEl.textContent = this.errorText;
        this.errorEl.hidden = false;
      }
      // UX-1 (applied Turn 19): focus back to email input on error for accessible retry
      if (this.emailInput) {
        this.emailInput.setAttribute('aria-invalid', 'true');
        this.emailInput.focus();
      }
    }
  }
  customElements.define('dim-email-optin', DimEmailOptin);
})();
