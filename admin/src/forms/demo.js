import IMask from 'imask';
import JustValidate from 'just-validate';
import { bindContactForm } from '@shared/forms/contact-form.js';
export function initDemoForm(form, onSuccess, onPhoneChange) {
  return bindContactForm({
    IMask, JustValidate, form,
    email: form.querySelector('#admin-demo-email'), phone: form.querySelector('#admin-demo-phone'),
    emailErrors: form.querySelector('[data-email-errors]'), phoneErrors: form.querySelector('[data-phone-errors]'),
    errorLabelCssClass: 'text-sm text-destructive mt-2', onSuccess, onPhoneChange,
  });
}
