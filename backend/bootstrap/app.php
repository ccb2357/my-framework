<?php

use App\Http\Controllers\StatusController;
use App\Http\Middleware\AdminContext;
use App\Http\Middleware\AdminCsrf;
use App\Http\Middleware\AdminStartSession;
use App\Http\Middleware\ClientAuthContext;
use App\Http\Middleware\ClientCsrf;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: [
            __DIR__.'/../routes/pwa.php',
            __DIR__.'/../routes/website.php',
        ],
        health: '/up',
        then: function (): void {
            Route::middleware([AdminContext::class, EncryptCookies::class, AddQueuedCookiesToResponse::class, AdminStartSession::class, AdminCsrf::class, SubstituteBindings::class])->group(__DIR__.'/../routes/admin.php');
            // No web/api session middleware: database failure must remain a controlled 503.
            Route::get('/status', [StatusController::class, 'html'])->name('foundation.status.html');
            Route::get('/api/v1/status', [StatusController::class, 'json'])->name('foundation.status.json');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->web(prepend: [ClientAuthContext::class], replace: [ValidateCsrfToken::class => ClientCsrf::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request, Throwable $exception) => $request->is('api/*', 'sanctum/csrf-cookie') || $request->expectsJson());
        $exceptions->dontReportWhen(fn (Throwable $error) => request()->is('api/v1/auth/*', 'api/v1/admin/*', 'sanctum/csrf-cookie'));
        $exceptions->render(function (Throwable $error, Request $request) {
            if ($request->is('api/v1/auth/*', 'api/v1/admin/*', 'sanctum/csrf-cookie')) {
                $status = $error instanceof ValidationException ? 422 : ($error instanceof AuthenticationException ? 401 : ($error instanceof HttpExceptionInterface ? $error->getStatusCode() : 500));
                $body = ['message' => match ($status) {
                    401 => 'E-mail ou senha inválidos, ou sessão encerrada.', 403 => 'Acesso negado.', 404 => 'Não encontrado.', 409 => 'Já existe uma sessão ativa. Saia dela antes de entrar em outra conta.', 419 => 'Sessão expirada. Recarregue a página e tente novamente.', 422 => 'Confira os campos informados.', 429 => 'Muitas tentativas. Aguarde antes de repetir.', default => 'Não foi possível concluir a operação.'
                }];
                if ($error instanceof ValidationException) {
                    $body['errors'] = array_intersect_key($error->errors(), array_flip(['name', 'email', 'password', 'password_confirmation']));
                }

                return response()->json($body, $status, ['Cache-Control' => 'no-store, private']);
            }

            return null;
        });
    })->create();
