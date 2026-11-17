<?php

namespace App\Http\Middleware;

use App\Models\Administrator;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminSession
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::guard('admin')->user();
        abort_unless($user instanceof Administrator && $user->getKey() === 1, 401);

        return $next($request);
    }
}
