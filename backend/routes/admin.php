<?php

use App\Http\Controllers\AdminAuthController;
use App\Http\Middleware\AdminSession;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/admin/auth')->group(function () {
    Route::get('csrf-cookie', [AdminAuthController::class, 'csrf'])->middleware('throttle:admin-csrf');
    Route::post('login', [AdminAuthController::class, 'login'])->middleware('throttle:admin-login');
    Route::middleware([AdminSession::class])->group(function () {
        Route::get('me', [AdminAuthController::class, 'me'])->middleware('throttle:admin-read');
        Route::post('logout', [AdminAuthController::class, 'logout'])->middleware('throttle:admin-logout');
    });
});
