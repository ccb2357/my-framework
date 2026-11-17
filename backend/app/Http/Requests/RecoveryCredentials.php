<?php

namespace App\Http\Requests;

use App\Support\ClientValidation;

class RecoveryCredentials extends ClientCredentials
{
    public function rules(): array
    {
        $rules = parent::rules();
        if ($this->routeIs('*.password.forgot')) {
            return ['email' => $rules['email']];
        }
        $rules['password'][] = 'min:'.ClientValidation::policy()['passwordMin'];
        $rules['password_confirmation'] = ['required', 'string', 'same:password'];
        $rules['token'] = ['required', 'string', 'size:64', 'regex:/^[a-f0-9]{64}$/'];

        return $rules;
    }

    public function messages(): array
    {
        return array_merge(parent::messages(), ['token.required' => ClientValidation::messages()['resetInvalid'], 'token.size' => ClientValidation::messages()['resetInvalid'], 'token.regex' => ClientValidation::messages()['resetInvalid']]);
    }
}
