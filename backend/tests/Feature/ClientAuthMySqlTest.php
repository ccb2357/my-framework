<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

#[Group('mysql')]
class ClientAuthMySqlTest extends TestCase
{
    use RefreshDatabase;

    private function signup(array $changes = []): array
    {
        return array_replace(['name' => 'Cliente', 'email' => 'client@example.test', 'password' => 'ValidPassword123!', 'password_confirmation' => 'ValidPassword123!'], $changes);
    }

    public function test_signup_hashes_password_ignores_privileged_fields_and_authenticates_without_verification(): void
    {
        $this->withSession(['_token' => 'old-token']);
        $oldId = session()->getId();
        $this->postJson('/api/v1/auth/register', $this->signup(['email' => ' CLIENT@EXAMPLE.TEST ', 'is_push_test' => true, 'push_enabled' => true, 'role' => 'admin', 'email_verified_at' => now()]))->assertCreated()->assertJsonPath('user.email', 'client@example.test')->assertJsonCount(3, 'user')->assertDontSee('password');
        $user = User::firstOrFail();
        $this->assertAuthenticatedAs($user, 'web');
        $this->assertTrue(Hash::check('ValidPassword123!', $user->password));
        $this->assertFalse($user->is_push_test);
        $this->assertFalse($user->push_enabled);
        $this->assertNull($user->email_verified_at);
        $this->assertNotSame($oldId, session()->getId());
        $this->assertNotSame('old-token', session()->token());
        $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('user.id', $user->id);
    }

    public function test_duplicate_email_is_rejected_without_creating_or_changing_a_session(): void
    {
        $user = User::factory()->create(['email' => 'client@example.test']);
        $password = $user->password;
        $this->postJson('/api/v1/auth/register', $this->signup(['email' => 'CLIENT@EXAMPLE.TEST']))->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertDatabaseCount('users', 1);
        $this->assertSame($password, $user->fresh()->password);
        $this->assertGuest('web');
    }

    public function test_login_rotates_session_wrong_credentials_and_push_test_users_are_rejected(): void
    {
        $user = User::factory()->create(['email' => 'client@example.test', 'password' => 'ValidPassword123!']);
        $test = User::factory()->create(['email' => 'push@example.test', 'password' => 'ValidPassword123!', 'is_push_test' => true]);
        foreach (['absent@example.test', $test->email] as $email) {
            $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'ValidPassword123!'])->assertUnauthorized()->assertDontSee('trace');
        }
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'Incorrect123!'])->assertUnauthorized();
        $this->withSession(['_token' => 'old-token']);
        $id = session()->getId();
        $this->postJson('/api/v1/auth/login', ['email' => ' CLIENT@EXAMPLE.TEST ', 'password' => 'ValidPassword123!'])->assertOk()->assertJsonPath('user.id', $user->id);
        $this->assertAuthenticatedAs($user, 'web');
        $this->assertNotSame($id, session()->getId());
        $this->assertNotSame('old-token', session()->token());
    }

    public function test_active_session_cannot_be_silently_replaced_by_signup_or_login(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web')->postJson('/api/v1/auth/register', $this->signup())->assertStatus(409);
        $this->postJson('/api/v1/auth/login', ['email' => 'other@example.test', 'password' => 'ValidPassword123!'])->assertStatus(409);
        $this->assertAuthenticatedAs($user, 'web');
        $this->assertDatabaseCount('users', 1);
    }

    public function test_logout_revokes_only_session_device_and_ends_access(): void
    {
        $user = User::factory()->create();
        $create = fn ($suffix) => $user->pushSubscriptions()->create(['endpoint' => 'https://fcm.googleapis.com/'.$suffix, 'endpoint_hash' => hash('sha256', $suffix), 'public_key' => 'test-key', 'auth_token' => 'test-auth']);
        $current = $create('current');
        $other = $create('other');
        $this->actingAs($user, 'web')->withSession(['push_subscription_id' => $current->id, '_token' => 'old-token'])->postJson('/api/v1/auth/logout')->assertNoContent()->assertHeader('Cache-Control', 'no-store, private');
        $this->assertGuest('web');
        $this->assertFalse($user->pushSubscriptions()->whereKey($current->id)->exists());
        $this->assertTrue($user->pushSubscriptions()->whereKey($other->id)->exists());
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->assertNull(Auth::guard('web')->user());
        $this->assertNotSame('old-token', session()->token());
    }
}
