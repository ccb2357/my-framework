<?php

use App\Http\Controllers\ClientAuthController;
use App\Http\Controllers\PushController;
use App\Http\Controllers\PushTestSessionController;
use App\Http\Middleware\ClientSession;
use App\Http\Middleware\PushNoStore;
use App\Http\Middleware\PushSession;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/status');

// Always use the web CSRF/session stack, even when Origin is absent.
Route::prefix('api/v1/push')->middleware([PushNoStore::class])->group(function (): void {
    Route::get('test-session', [PushTestSessionController::class, 'show']);
    Route::post('test-session', [PushTestSessionController::class, 'store'])->middleware('throttle:push-login');
    Route::post('test-logout', [PushTestSessionController::class, 'destroy'])->middleware('throttle:push-logout');
    Route::middleware(['auth:sanctum', PushSession::class, 'throttle:push-api'])->group(function (): void {
        $controller = PushController::class;
        Route::get('config', [$controller, 'config']);
        Route::get('subscriptions', [$controller, 'index']);
        Route::post('subscriptions', [$controller, 'store'])->middleware('throttle:push-subscriptions');
        Route::delete('subscriptions/{id}', [$controller, 'destroy'])->whereNumber('id');
        Route::get('preferences', [$controller, 'preferences']);
        Route::put('preferences', [$controller, 'updatePreferences']);
        Route::post('test', [$controller, 'test'])->middleware('throttle:push-test');
        Route::get('deliveries', [$controller, 'deliveries']);
    });
});

// Client session APIs always use web CSRF, including requests without Origin.
Route::prefix('api/v1/auth')->group(function (): void {
    $controller = ClientAuthController::class;
    Route::post('register', [$controller, 'register'])->name('client.register')->middleware('throttle:client-register');
    Route::post('login', [$controller, 'login'])->name('client.login')->middleware('throttle:client-login');
    Route::middleware([ClientSession::class])->group(function () use ($controller): void {
        Route::get('me', [$controller, 'me'])->middleware('throttle:client-read');
        Route::post('logout', [$controller, 'logout'])->middleware('throttle:client-logout');
    });
});
