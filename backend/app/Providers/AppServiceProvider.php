<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        foreach (['client', 'admin'] as $area) {
            foreach (['forgot' => 5, 'reset' => 10] as $action => $max) {
                RateLimiter::for($area.'-password-'.$action, fn (Request $r) => [Limit::perMinute($max)->by($area.'-'.$action.'-ip:'.$r->ip()), Limit::perMinute($max)->by($area.'-'.$action.':'.hash('sha256', is_string($r->input('email')) ? strtolower(trim($r->input('email'))) : ''))]);
            }
        }
        RateLimiter::for('admin-login', function (Request $request) {
            $email = is_string($request->input('email')) ? strtolower(trim($request->input('email'))) : '';

            return [Limit::perMinute(20)->by('admin-login-ip:'.$request->ip()), Limit::perMinute(5)->by('admin-login:'.hash('sha256', $email.'|'.$request->ip()))];
        });
        foreach (['admin-csrf' => 30, 'admin-read' => 60, 'admin-logout' => 10] as $name => $attempts) {
            RateLimiter::for($name, fn (Request $request) => Limit::perMinute($attempts)->by($name.':'.$request->ip()));
        }
        RateLimiter::for('client-login', function (Request $request) {
            $email = is_string($request->input('email')) ? strtolower(trim($request->input('email'))) : '';

            return [Limit::perMinute(20)->by('client-login-ip:'.$request->ip()), Limit::perMinute(5)->by('client-login:'.hash('sha256', $email.'|'.$request->ip()))];
        });
        foreach (['client-register' => 5, 'client-read' => 60, 'client-logout' => 10] as $name => $attempts) {
            RateLimiter::for($name, fn (Request $request) => Limit::perMinute($attempts)->by($name.':'.($name === 'client-register' ? $request->ip() : Auth::guard('web')->id())));
        }
    }
}
