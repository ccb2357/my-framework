<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ClientAuthGuardsTest extends TestCase
{
    public function test_guest_and_token_only_identity_cannot_read_client_session(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized()->assertHeader('Cache-Control', 'no-store, private')->assertDontSee('trace');
        $user = new User(['name' => 'Token', 'email' => 'token@example.test']);
        $user->id = 42;
        Auth::guard('sanctum')->setUser($user);
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_real_session_returns_only_the_client_resource_and_test_session_is_rejected(): void
    {
        $user = new User(['name' => 'Cliente', 'email' => 'client@example.test', 'password' => 'Secret123!']);
        $user->id = 42;
        $this->actingAs($user, 'web')->getJson('/api/v1/auth/me')->assertOk()->assertExactJson(['user' => ['id' => 42, 'name' => 'Cliente', 'email' => 'client@example.test']])->assertHeader('Cache-Control', 'no-store, private');
        $user->is_push_test = true;
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_admin_host_and_foreign_or_malformed_origins_are_rejected_before_auth(): void
    {
        config(['app.url' => 'http://localhost', 'sanctum.stateful' => ['localhost', 'localhost:5180']]);
        $this->getJson('http://admin.localhost/api/v1/auth/me')->assertForbidden();
        foreach (['https://evil.example', 'http://localhost.evil.example', 'null', 'http://user@localhost', 'http://localhost?query=1', 'http://localhost/path'] as $origin) {
            $this->withServerVariables(['HTTP_HOST' => 'localhost'])->withHeader('Origin', $origin)->getJson('http://localhost/api/v1/auth/me')->assertForbidden();
        }
        $this->withHeader('Origin', 'http://localhost:5180')->getJson('http://localhost/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_csrf_is_required_even_without_origin_and_validation_is_controlled(): void
    {
        $this->app['env'] = 'local';
        $this->withSession(['_token' => 'expected'])->postJson('/api/v1/auth/register', [])->assertStatus(419)->assertHeader('Cache-Control', 'no-store, private');
        $this->withSession(['_token' => 'expected'])->postJson('/api/v1/auth/register', ['_token' => 'expected', 'password' => ['invalid']])->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'password', 'password_confirmation'])->assertDontSee('trace');
    }

    public function test_registration_checks_password_characters_confirmation_and_bcrypt_byte_limit(): void
    {
        $data = ['name' => 'Cliente', 'email' => 'client@example.test', 'password' => 'short', 'password_confirmation' => 'different'];
        $this->postJson('/api/v1/auth/register', $data)->assertUnprocessable()->assertJsonValidationErrors(['password', 'password_confirmation']);
        $data['password'] = $data['password_confirmation'] = str_repeat('á', 37);
        $this->postJson('/api/v1/auth/register', $data)->assertUnprocessable()->assertJsonValidationErrors('password');
        $data['password'] = $data['password_confirmation'] = "Secret\0Invalid";
        $this->postJson('/api/v1/auth/register', $data)->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_login_register_and_reading_have_independent_limits(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->getJson('/api/v1/auth/me')->assertUnauthorized();
        }
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login')->assertUnprocessable();
        }
        $this->postJson('/api/v1/auth/login')->assertStatus(429)->assertHeader('Cache-Control', 'no-store, private');
        $this->postJson('/api/v1/auth/register')->assertUnprocessable();
    }

    public function test_unexpected_exception_does_not_expose_private_diagnostics(): void
    {
        Route::middleware('web')->get('/api/v1/auth/_test-failure', fn () => throw new \RuntimeException('PRIVATE-DATABASE-AND-SECRET'));
        $this->getJson('/api/v1/auth/_test-failure')->assertStatus(500)->assertHeader('Cache-Control', 'no-store, private')->assertDontSee('PRIVATE')->assertDontSee('trace');
    }
}
