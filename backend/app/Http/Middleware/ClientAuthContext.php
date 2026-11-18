<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ClientAuthContext
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->is('api/v1/auth/*', 'sanctum/csrf-cookie')) {
            return $next($request);
        }
        // Validate every client session entry point before cookies/session/CSRF.
        $hosts = array_filter([parse_url(config('app.url'), PHP_URL_HOST), parse_url(config('foundation.website_url') ?? '', PHP_URL_HOST)]);
        abort_unless(in_array($request->getHost(), $hosts, true), 403);
        $origin = $request->headers->get('Origin');
        if ($origin !== null) {
            $parts = parse_url($origin);
            $host = is_array($parts) ? ($parts['host'] ?? '').(isset($parts['port']) ? ':'.$parts['port'] : '') : '';
            abort_unless(is_array($parts) && in_array($parts['scheme'] ?? '', ['http', 'https'], true) && ! isset($parts['user']) && ! isset($parts['pass']) && ! isset($parts['query']) && ! isset($parts['fragment']) && (! isset($parts['path']) || $parts['path'] === '/') && in_array($host, config('sanctum.stateful', []), true) && (! app()->environment('production') || $parts['scheme'] === 'https'), 403);
        }
        $previous = config('session');
        $store = app('session.store');
        $previousName = $store->getName();
        $cookie = config('foundation.client_session_cookie') ?: $previous['cookie'];
        // localhost Vite/preview/ADB has no common domain with the named sites.
        $localSource = $origin ?? $request->headers->get('Referer');
        $originHost = $localSource ? parse_url($localSource, PHP_URL_HOST) : null;
        if ($origin === null && in_array($originHost, ['localhost', '127.0.0.1'], true)) {
            $parts = parse_url($localSource);
            $authority = $originHost.(isset($parts['port']) ? ':'.$parts['port'] : '');
            abort_unless(in_array($authority, config('sanctum.stateful', []), true), 403);
        }
        $local = app()->environment('local', 'testing') && in_array($originHost, ['localhost', '127.0.0.1'], true);
        config(['session.cookie' => $cookie, 'session.domain' => $local ? null : (config('foundation.client_session_domain') ?: $previous['domain'])]);
        $store->setName($cookie);
        try {
            $response = $next($request);
            $response->headers->set('Cache-Control', 'no-store, private');

            return $response;
        } finally {
            config(['session' => $previous]);
            $store->setName($previousName);
        }
    }
}
