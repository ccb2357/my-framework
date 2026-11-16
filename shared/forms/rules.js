import texts from './messages.pt-BR.json';
export const messages = Object.freeze(texts);
export function requiredRules(message = messages.required) {
  return [{ rule: 'required', errorMessage: message }];
}
export function emailRules() {
  return [
    ...requiredRules(messages.emailRequired),
    { rule: 'email', errorMessage: messages.emailInvalid },
  ];
}
export function mobileRules(unmaskedValue) {
  return [
    ...requiredRules(messages.phoneRequired),
    { validator: () => /^\d{11}$/.test(unmaskedValue()), errorMessage: messages.phoneIncomplete },
  ];
}
