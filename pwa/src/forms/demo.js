import IMask from 'imask';
import JustValidate from 'just-validate';
import { bindContactForm } from '@shared/forms/contact-form.js';
export function initDemoForm(form, onSuccess, onPhoneChange) {
  const controller = bindContactForm({
    IMask, JustValidate, form,
    email: form.querySelector('#demo-email'), phone: form.querySelector('#demo-phone'),
    onSuccess, onPhoneChange,
  });
  return () => controller.destroy();
}
