<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClientCredentials;
use App\Models\Administrator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminAuthController
{
    private function resource(Administrator $user): array
    {
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email];
    }

    public function csrf()
    {
        return response()->noContent();
    }

    public function login(ClientCredentials $request)
    {
        abort_if(Auth::guard('admin')->check(), 409);
        $data = $request->validated();
        abort_unless(Auth::guard('admin')->attempt(['id' => 1, 'email' => $data['email'], 'password' => $data['password']]), 401);
        $request->session()->regenerate();
        $request->session()->regenerateToken();

        return response()->json(['user' => $this->resource(Auth::guard('admin')->user())]);
    }

    public function me()
    {
        return response()->json(['user' => $this->resource(Auth::guard('admin')->user())]);
    }

    public function logout(Request $request)
    {
        Auth::guard('admin')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
