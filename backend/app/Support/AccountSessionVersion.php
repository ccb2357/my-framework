<?php

namespace App\Support;

use Illuminate\Support\Facades\Auth;

class AccountSessionVersion
{
    public static function check($request, $user, string $guard): void
    {
        $version = (int) ($user->auth_version ?? 0);
        if ((int) $request->session()->get($guard.'_auth_version', 0) !== $version) {
            Auth::guard($guard)->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            abort(401);
        }
    }
}
