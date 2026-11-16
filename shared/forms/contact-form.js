import { mobileMaskOptions } from './masks.js';
import { emailRules, mobileRules } from './rules.js';

// Libraries are injected by each app: shared code does not resolve another app's node_modules.
// No UI framework or CSS belongs here. Containers/classes are supplied by the caller.
export function bindContactForm({ IMask, JustValidate, form, email, phone, emailErrors, phoneErrors, errorLabelCssClass, onSuccess = () => {}, onPhoneChange }) {
  const attributes = new Map([email, phone].map(input => [input, {
    invalid: input.getAttribute('aria-invalid'), description: input.getAttribute('aria-describedby'),
  }]));
  const restore = (input, name, value) => value === null ? input.removeAttribute(name) : input.setAttribute(name, value);
  const containers = new Map([[email, emailErrors || email.parentElement], [phone, phoneErrors || phone.parentElement]]);
  const mask = IMask(phone, mobileMaskOptions());
  mask.on('accept', () => onPhoneChange?.(mask.value));
  let validator;
  try {
    validator = new JustValidate(form, {
      errorFieldStyle: {}, errorLabelStyle: {}, focusInvalidField: true,
      ...(errorLabelCssClass ? { errorLabelCssClass } : {}),
    });
    validator.addField(email, emailRules(), emailErrors ? { errorsContainer: emailErrors } : undefined)
      .addField(phone, mobileRules(() => mask.unmaskedValue), phoneErrors ? { errorsContainer: phoneErrors } : undefined)
      .onValidate(({ fields }) => {
        for (const field of Object.values(fields)) {
          const input = field.elem, previous = attributes.get(input);
          if (!previous || typeof field.isValid !== 'boolean') continue;
          input.setAttribute('aria-invalid', String(!field.isValid));
          const label = containers.get(input).querySelector('.just-validate-error-label');
          if (!field.isValid && label) {
            label.id = `${input.id}-error`;
            input.setAttribute('aria-describedby', [previous.description, label.id].filter(Boolean).join(' '));
          } else restore(input, 'aria-describedby', previous.description);
        }
      }).onSuccess(event => { event?.preventDefault(); onSuccess(); });
  } catch (error) { validator?.destroy(); mask.destroy(); throw error; }
  let destroyed = false;
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      validator.destroy(); mask.destroy();
      for (const [input, previous] of attributes) {
        restore(input, 'aria-invalid', previous.invalid);
        restore(input, 'aria-describedby', previous.description);
      }
    },
  };
}
