<?php

namespace App\Http\Middleware;

use App\Support\AccountSessionVersion;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PushSession
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless(Auth::guard('web')->check(), 401);

        AccountSessionVersion::check($request, Auth::guard('web')->user(), 'web');

        return $next($request);
    }
}
