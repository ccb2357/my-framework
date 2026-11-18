import { bindContactForm } from '@shared/forms/contact-form.js';

// Each application owns its libraries; DOM integrations run only after mounting.
export async function initDemoForm(form, onSuccess, onPhoneChange, isActive = () => true) {
  const [{ default: IMask }, { default: JustValidate }] = await Promise.all([
    import('imask'), import('just-validate'),
  ]);
  if (!isActive()) return null;
  return bindContactForm({
    IMask, JustValidate, form,
    email: form.querySelector('#website-demo-email'), phone: form.querySelector('#website-demo-phone'),
    emailErrors: form.querySelector('[data-email-errors]'), phoneErrors: form.querySelector('[data-phone-errors]'),
    errorLabelCssClass: 'text-sm text-destructive mt-2', onSuccess, onPhoneChange,
  });
}
