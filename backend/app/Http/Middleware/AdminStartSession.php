<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Cache\Factory;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Session\SessionManager;
use Illuminate\Support\Facades\Auth;

class AdminStartSession
{
    public function handle($request, Closure $next)
    {
        $app = app();
        $previous = config('session');
        $previousStore = $app->make('session.store');
        $admin = array_replace($previous, ['cookie' => $previous['cookie'].'_admin', 'domain' => null, 'table' => 'admin_sessions', 'files' => $previous['files'].'/admin']);
        config(['session' => $admin]);
        try {
            if ($admin['driver'] === 'file') {
                $app['files']->ensureDirectoryExists($admin['files'], 0770);
            }
            // A dedicated manager/store prevents localhost ports and guard instances from sharing state.
            if (! $app->bound('admin.session.manager')) {
                $app->instance('admin.session.manager', new SessionManager($app));
            }
            $manager = $app->make('admin.session.manager');
            $manager->driver()->flush();
            $app->instance('session.store', $manager->driver());
            Auth::forgetGuards();
            $middleware = new StartSession($manager, fn () => $app->make(Factory::class));

            return $middleware->handle($request, $next);
        } finally {
            config(['session' => $previous]);
            $app->instance('session.store', $previousStore);
            Auth::forgetGuards();
        }
    }
}
