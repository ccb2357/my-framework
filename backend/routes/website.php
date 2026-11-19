<?php

use App\Http\Controllers\WebsiteContentController;
use Illuminate\Support\Facades\Route;

// Conteúdo público sem sessão/CSRF: registro explícito em bootstrap/app.php.
// Não reutilize este pipeline anônimo para APIs autenticadas de cliente ou admin.
// /api/v1/auth/* e /sanctum/csrf-cookie continuam registrados uma única vez em pwa.php.
Route::get('/api/v1/website/content', [WebsiteContentController::class, 'show'])->name('website.content');
