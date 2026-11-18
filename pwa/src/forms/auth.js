import JustValidate from 'just-validate';
import { nameRules, accountEmailRules, passwordRules, confirmationRules } from '@shared/forms/rules.js';
export function initAuthForm(form, registration, onSuccess) {
  const inputs = [...form.querySelectorAll('input')];
  const previous = new Map(inputs.map(input => [input, { invalid: input.getAttribute('aria-invalid'), description: input.getAttribute('aria-describedby') }]));
  const validator = new JustValidate(form, { errorFieldStyle: {}, errorLabelStyle: {}, focusInvalidField: true });
  const field = name => form.querySelector(`[name="${name}"]`);
  const add = (name, rules) => {
    const container = form.querySelector(`[data-errors="${name}"]`);
    field(name).setAttribute('aria-describedby', container.id);
    validator.addField(field(name), rules, { errorsContainer: container });
  };
  if (registration) add('name', nameRules());
  add('email', accountEmailRules()); add('password', passwordRules(registration, () => field('password').value));
  if (registration) add('password_confirmation', confirmationRules(() => field('password').value, () => field('password_confirmation').value));
  validator.onValidate(({ fields }) => {
    for (const item of Object.values(fields)) if (typeof item.isValid === 'boolean') item.elem.setAttribute('aria-invalid', String(!item.isValid));
  }).onSuccess(event => { event?.preventDefault(); onSuccess(); });
  return () => {
    validator.destroy();
    for (const [input, values] of previous) for (const [attribute, value] of [['aria-invalid', values.invalid], ['aria-describedby', values.description]]) { if (value === null) input.removeAttribute(attribute); else input.setAttribute(attribute, value); }
  };
}
