import { nameRules, accountEmailRules, passwordRules, confirmationRules } from '@shared/forms/rules.js';
export async function initAuthForm(form, registration, submit, isActive = () => true) {
  const { default: JustValidate } = await import('just-validate');
  if (!isActive()) return null;
  const validator = new JustValidate(form, { errorFieldStyle: {}, errorLabelStyle: {}, focusInvalidField: true });
  const field = name => form.querySelector(`[name="${name}"]`);
  const add = (name, rules) => {
    const errors = form.querySelector(`[data-errors="${name}"]`);
    field(name).setAttribute('aria-describedby', errors.id);
    validator.addField(field(name), rules, { errorsContainer: errors });
  };
  if (registration) add('name', nameRules());
  add('email', accountEmailRules()); add('password', passwordRules(registration, () => field('password').value));
  if (registration) add('password_confirmation', confirmationRules(() => field('password').value, () => field('password_confirmation').value));
  validator.onValidate(({ fields }) => { for (const item of Object.values(fields)) if (typeof item.isValid === 'boolean') item.elem.setAttribute('aria-invalid', String(!item.isValid)); }).onSuccess(event => { event?.preventDefault(); submit(); });
  return () => validator.destroy();
}
