<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ClientAuthContext
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->is('api/v1/auth/*')) {
            return $next($request);
        }
        // Run before web cookies/session/CSRF: admin host must not authenticate clients.
        abort_unless($request->getHost() === parse_url(config('app.url'), PHP_URL_HOST), 403);
        $origin = $request->headers->get('Origin');
        if ($origin !== null) {
            $parts = parse_url($origin);
            $host = is_array($parts) ? ($parts['host'] ?? '').(isset($parts['port']) ? ':'.$parts['port'] : '') : '';
            abort_unless(is_array($parts) && in_array($parts['scheme'] ?? '', ['http', 'https'], true) && ! isset($parts['user']) && ! isset($parts['pass']) && ! isset($parts['query']) && ! isset($parts['fragment']) && (! isset($parts['path']) || $parts['path'] === '/') && in_array($host, config('sanctum.stateful', []), true) && (! app()->environment('production') || $parts['scheme'] === 'https'), 403);
        }
        $response = $next($request);
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }
}
