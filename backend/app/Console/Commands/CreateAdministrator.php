<?php

namespace App\Console\Commands;

use App\Models\Administrator;
use App\Support\ClientValidation;
use Illuminate\Console\Command;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Validator;

class CreateAdministrator extends Command
{
    protected $signature = 'admin:create {email} {--name= : Nome do administrador}';

    protected $description = 'Cria o único administrador com senha solicitada sem exibição.';

    public function handle(): int
    {
        if (Administrator::exists()) {
            $this->error('O administrador já existe. Nenhuma conta foi alterada.');

            return self::FAILURE;
        }
        $p = ClientValidation::policy();
        $name = $this->option('name') ?: $this->ask('Nome do administrador');
        $email = strtolower(trim($this->argument('email')));
        $identity = Validator::make(['name' => $name, 'email' => $email], ['name' => ['required', 'string', 'max:'.$p['nameMax']], 'email' => ['required', 'email:rfc', 'max:'.$p['emailMax']]]);
        if ($identity->fails()) {
            $this->error('Informe nome e e-mail válidos.');

            return self::FAILURE;
        }
        $password = $this->secret('Senha do administrador');
        $confirmation = $this->secret('Confirme a senha');
        if (! is_string($password) || trim($password) === '' || mb_strlen($password) < $p['passwordMin'] || strlen($password) > $p['passwordMaxBytes'] || str_contains($password, "\0") || $password !== $confirmation) {
            $this->error('Senha inválida: use pelo menos '.$p['passwordMin'].' caracteres, até '.$p['passwordMaxBytes'].' bytes, e confirmação idêntica.');

            return self::FAILURE;
        }
        try {
            $user = new Administrator(['name' => $name, 'email' => $email, 'password' => $password]);
            $user->id = 1;
            $user->save();
        } catch (UniqueConstraintViolationException) {
            $this->error('O administrador já existe. Nenhuma conta foi alterada.');

            return self::FAILURE;
        }
        $this->info('Administrador criado. Entre pelo endereço administrativo.');

        return self::SUCCESS;
    }
}
