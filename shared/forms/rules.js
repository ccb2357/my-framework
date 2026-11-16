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

import authPolicy from './auth-policy.json';
export { authPolicy };

export function nameRules() {
  return [...requiredRules(messages.nameRequired), { rule: 'maxLength', value: authPolicy.nameMax, errorMessage: messages.nameMax }];
}
export function accountEmailRules() {
  return [...emailRules(), { rule: 'maxLength', value: authPolicy.emailMax, errorMessage: messages.emailMax }];
}
export function passwordRules(registration = false, readValue) {
  return [
    ...requiredRules(messages.passwordRequired),
    { validator: value => !(readValue ? readValue() : value).includes('\0'), errorMessage: messages.passwordInvalid },
    ...(registration ? [{ validator: value => Array.from(readValue ? readValue() : value).length >= authPolicy.passwordMin, errorMessage: messages.passwordMin }] : []),
    { validator: value => new globalThis.TextEncoder().encode(readValue ? readValue() : value).length <= authPolicy.passwordMaxBytes, errorMessage: messages.passwordMax },
  ];
}
export function confirmationRules(password, readValue) {
  return [...requiredRules(messages.confirmationRequired), { validator: value => (readValue ? readValue() : value) === password(), errorMessage: messages.confirmationMismatch }];
}
