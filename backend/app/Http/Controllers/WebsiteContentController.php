<?php

namespace App\Http\Controllers;

use App\Services\WebsiteContent;
use Illuminate\Http\JsonResponse;

class WebsiteContentController
{
    public function show(WebsiteContent $content): JsonResponse
    {
        try {
            return response()->json(['data' => $content->read()], 200, ['Cache-Control' => 'no-store']);
        } catch (\Throwable) {
            return response()->json(['message' => 'Conteúdo temporariamente indisponível.'], 503, ['Cache-Control' => 'no-store']);
        }
    }
}
