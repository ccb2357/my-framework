<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\AccountSessionVersion;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ClientSession
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::guard('web')->user();
        abort_unless($user instanceof User, 401);

        AccountSessionVersion::check($request, $user, 'web');

        return $next($request);
    }
}
