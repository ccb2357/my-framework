<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClientCredentials;
use App\Models\User;
use App\Support\ClientValidation;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class ClientAuthController
{
    private function guest(): void
    {
        abort_if(Auth::guard('web')->check(), 409);
    }

    private function resource(User $user): array
    {
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email];
    }

    public function register(ClientCredentials $request)
    {
        $this->guest();
        $data = $request->validated();
        if (User::where('email', $data['email'])->exists()) {
            throw ValidationException::withMessages(['email' => ClientValidation::messages()['emailUnavailable']]);
        }
        try {
            $user = User::create(['name' => $data['name'], 'email' => $data['email'], 'password' => $data['password']]);
        } catch (UniqueConstraintViolationException $error) {
            throw ValidationException::withMessages(['email' => ClientValidation::messages()['emailUnavailable']]);
        }
        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $request->session()->regenerateToken();
        if (Auth::guard('web')->check()) {
            $request->session()->put('web_auth_version', (int) Auth::guard('web')->user()->auth_version);
        }

        return response()->json(['user' => $this->resource($user)], 201);
    }

    public function login(ClientCredentials $request)
    {
        $this->guest();
        $data = $request->validated();
        abort_unless(Auth::guard('web')->attempt(['email' => $data['email'], 'password' => $data['password'], 'is_push_test' => false]), 401);
        $request->session()->regenerate();
        $request->session()->regenerateToken();
        if (Auth::guard('web')->check()) {
            $request->session()->put('web_auth_version', (int) Auth::guard('web')->user()->auth_version);
        }

        return response()->json(['user' => $this->resource(Auth::guard('web')->user())]);
    }

    public function me()
    {
        return response()->json(['user' => $this->resource(Auth::guard('web')->user())]);
    }

    public function logout(Request $request)
    {
        // Logout event revokes the subscription linked to this session only.
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
