<?php

namespace App\Http\Controllers;

use App\Http\Requests\RecoveryCredentials;
use App\Support\ClientValidation;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PasswordRecoveryController
{
    private function area($request): string
    {
        return $request->routeIs('admin.*') ? 'admin' : 'client';
    }

    public function forgot(RecoveryCredentials $request)
    {
        $area = $this->area($request);
        // Never send reset links to a log transport or silently fall back to one.
        if (config('mail.default') === 'smtp' && config('foundation.recovery_enabled')) {
            try {
                Password::broker($area === 'admin' ? 'administrators' : 'clients')->sendResetLink($request->safe()->only('email'));
            } catch (\Throwable) {
                Log::warning('password-recovery-mail-unavailable', ['area' => $area]);
            }
        }

        return response()->json(['message' => ClientValidation::messages()['recoverySent']]);
    }

    public function reset(RecoveryCredentials $request)
    {
        $area = $this->area($request);
        $broker = $area === 'admin' ? 'administrators' : 'clients';
        $data = $request->validated();
        $status = DB::transaction(function () use ($broker, $data) {
            DB::table(config('auth.passwords.'.$broker.'.table'))->where('email', $data['email'])->lockForUpdate()->first();

            return Password::broker($broker)->reset($data, function ($user, $password) {
                $user->password = $password;
                $user->setRememberToken(Str::random(60));
                $user->auth_version = (int) $user->auth_version + 1;
                $user->save();
                event(new PasswordReset($user));
            });
        });

        return response()->json(['message' => ClientValidation::messages()[$status === Password::PASSWORD_RESET ? 'resetDone' : 'resetInvalid']], $status === Password::PASSWORD_RESET ? 200 : 422);
    }
}
