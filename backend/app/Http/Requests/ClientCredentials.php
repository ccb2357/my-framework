<?php

namespace App\Http\Requests;

use App\Support\ClientValidation;
use Illuminate\Foundation\Http\FormRequest;

class ClientCredentials extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => strtolower(trim($this->input('email')))]);
        }
    }

    public function rules(): array
    {
        $policy = ClientValidation::policy();
        $messages = ClientValidation::messages();
        $password = ['required', 'string', function ($attribute, $value, $fail) use ($policy, $messages) {
            if (is_string($value) && str_contains($value, "\0")) {
                $fail($messages['passwordInvalid']);
            }
            if (is_string($value) && strlen($value) > $policy['passwordMaxBytes']) {
                $fail($messages['passwordMax']);
            }
        }];
        $rules = ['email' => ['required', 'string', 'email:rfc', 'max:'.$policy['emailMax']], 'password' => $password];
        if ($this->routeIs('client.register')) {
            $rules['name'] = ['required', 'string', 'max:'.$policy['nameMax']];
            $rules['password'][] = 'min:'.$policy['passwordMin'];
            $rules['password_confirmation'] = ['required', 'string', 'same:password'];
        }

        return $rules;
    }

    public function messages(): array
    {
        $m = ClientValidation::messages();

        return [
            'name.required' => $m['nameRequired'], 'name.string' => $m['nameRequired'], 'name.max' => $m['nameMax'],
            'email.required' => $m['emailRequired'], 'email.string' => $m['emailInvalid'], 'email.email' => $m['emailInvalid'], 'email.max' => $m['emailMax'],
            'password.required' => $m['passwordRequired'], 'password.string' => $m['passwordRequired'], 'password.min' => $m['passwordMin'],
            'password_confirmation.required' => $m['confirmationRequired'], 'password_confirmation.string' => $m['confirmationRequired'], 'password_confirmation.same' => $m['confirmationMismatch'],
        ];
    }
}
