<?php

use App\Http\Controllers\ClientAuthController;
use App\Http\Controllers\PasswordRecoveryController;
use App\Http\Middleware\ClientSession;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/status');

// Client session APIs always use web CSRF, including requests without Origin.
Route::prefix('api/v1/auth')->group(function (): void {
    Route::post('forgot-password', [PasswordRecoveryController::class, 'forgot'])->name('client.password.forgot')->middleware('throttle:client-password-forgot');
    Route::post('reset-password', [PasswordRecoveryController::class, 'reset'])->name('client.password.reset')->middleware('throttle:client-password-reset');
    $controller = ClientAuthController::class;
    Route::post('register', [$controller, 'register'])->name('client.register')->middleware('throttle:client-register');
    Route::post('login', [$controller, 'login'])->name('client.login')->middleware('throttle:client-login');
    Route::middleware([ClientSession::class])->group(function () use ($controller): void {
        Route::get('me', [$controller, 'me'])->middleware('throttle:client-read');
        Route::post('logout', [$controller, 'logout'])->middleware('throttle:client-logout');
    });
});
