<?php

namespace App\Support;

class ClientValidation
{
    public static function policy(): array
    {
        return json_decode(file_get_contents(base_path('../shared/forms/auth-policy.json')), true, 16, JSON_THROW_ON_ERROR);
    }

    public static function messages(): array
    {
        return json_decode(file_get_contents(base_path('../shared/forms/messages.pt-BR.json')), true, 16, JSON_THROW_ON_ERROR);
    }
}
