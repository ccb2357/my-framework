<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ClientSession
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::guard('web')->user();
        abort_unless($user && ! $user->is_push_test, 401);

        return $next($request);
    }
}
