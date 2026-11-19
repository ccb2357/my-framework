<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class WebsitePublicContext
{
    public function handle(Request $request, Closure $next)
    {
        $url = config('foundation.website_url');
        abort_unless(is_string($url) && $request->getHost() === parse_url($url, PHP_URL_HOST), 403);
        $origin = $request->headers->get('Origin');
        if ($origin !== null) {
            // A public GET does not need a session, but still respects the configured interface boundary.
            $parts = parse_url($origin);
            $host = is_array($parts) ? ($parts['host'] ?? '').(isset($parts['port']) ? ':'.$parts['port'] : '') : '';
            abort_unless(is_array($parts) && in_array($parts['scheme'] ?? '', ['http', 'https'], true) && ! isset($parts['user']) && ! isset($parts['pass']) && ! isset($parts['query']) && ! isset($parts['fragment']) && (! isset($parts['path']) || $parts['path'] === '/') && in_array($host, config('sanctum.stateful', []), true) && (! app()->environment('production') || $parts['scheme'] === 'https'), 403);
        }
        $response = $next($request);
        $response->headers->set('Cache-Control', 'no-store');

        return $response;
    }
}
