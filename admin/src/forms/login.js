import JustValidate from 'just-validate';
import { accountEmailRules, passwordRules } from '@shared/forms/rules.js';
export function initAdminLogin(form, onSuccess) {
  const validator = new JustValidate(form, { errorFieldStyle: {}, errorLabelStyle: {}, focusInvalidField: true });
  for (const name of ['email', 'password']) {
    const input = form.querySelector(`[name="${name}"]`), container = form.querySelector(`[data-errors="${name}"]`);
    input.setAttribute('aria-describedby', container.id);
    validator.addField(input, name === 'email' ? accountEmailRules() : passwordRules(false, () => input.value), { errorsContainer: container });
  }
  validator.onValidate(({ fields }) => { for (const field of Object.values(fields)) if (typeof field.isValid === 'boolean') field.elem.setAttribute('aria-invalid', String(!field.isValid)); }).onSuccess(event => { event?.preventDefault(); onSuccess(); });
  return () => validator.destroy();
}
