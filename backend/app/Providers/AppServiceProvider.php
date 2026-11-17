<?php

namespace App\Providers;

use Illuminate\Auth\Events\Logout;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
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
        // Named limiters keep each operation's quota separate from other routes.
        foreach (['push-api' => 60, 'push-login' => 5, 'push-logout' => 10, 'push-subscriptions' => 20, 'push-test' => 3] as $name => $attempts) {
            RateLimiter::for($name, function (Request $request) use ($name, $attempts) {
                $id = $name === 'push-login' ? null : Auth::guard('web')->id();
                $key = $id !== null ? 'user:'.$id : 'ip:'.$request->ip();

                return Limit::perMinute($attempts)->by($key);
            });
        }

        Event::listen(Logout::class, function ($event): void {
            if ($event->guard === 'web' && $event->user && request()->hasSession() && ($id = request()->session()->pull('push_subscription_id'))) {
                $event->user->pushSubscriptions()->whereKey($id)->delete();
            }
        });
    }
}
