<?php

namespace App\Http\Middleware;

use App\Models\Administrator;
use App\Support\AccountSessionVersion;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminSession
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::guard('admin')->user();
        abort_unless($user instanceof Administrator && $user->getKey() === 1, 401);

        AccountSessionVersion::check($request, Auth::guard('admin')->user(), 'admin');

        return $next($request);
    }
}
