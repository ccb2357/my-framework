<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\User;
use App\Notifications\AccountPasswordReset;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

#[Group('mysql')]
class PasswordRecoveryMySqlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'http://localhost', 'foundation.admin_url' => 'http://admin.localhost', 'foundation.admin_origins' => ['admin.localhost'], 'foundation.recovery_enabled' => true, 'mail.default' => 'smtp']);
        Notification::fake();
    }

    private function endpoint($area, $action): string
    {
        return $area === 'admin' ? 'http://admin.localhost/api/v1/admin/auth/'.$action : 'http://localhost/api/v1/auth/'.$action;
    }

    private function accounts(): array
    {
        $u = User::factory()->create(['email' => 'same@example.test', 'password' => 'Client123!']);
        $a = new Administrator(['name' => 'Admin', 'email' => $u->email, 'password' => 'Admin123!']);
        $a->id = 1;
        $a->save();

        return [$u, $a];
    }

    private function token($user, $area): string
    {
        $this->postJson($this->endpoint($area, 'forgot-password'), ['email' => $user->email])->assertOk();
        $token = '';
        Notification::assertSentTo($user, AccountPasswordReset::class, function ($n) use (&$token, $area) {
            $token = $n->token;

            return $n->area === $area;
        });

        return $token;
    }

    private function payload($user, $token): array
    {
        return ['email' => $user->email, 'token' => $token, 'password' => 'Changed123!', 'password_confirmation' => 'Changed123!'];
    }

    public function test_brokers_store_hashes_and_cannot_reset_other_account_type_even_with_same_email(): void
    {
        [$u,$a] = $this->accounts();
        $client = $this->token($u, 'client');
        $admin = $this->token($a, 'admin');
        $this->assertNotSame($client, DB::table('client_password_reset_tokens')->value('token'));
        $this->postJson($this->endpoint('admin', 'reset-password'), $this->payload($a, $client))->assertUnprocessable();
        $this->postJson($this->endpoint('client', 'reset-password'), $this->payload($u, $admin))->assertUnprocessable();
        $this->postJson($this->endpoint('client', 'reset-password'), $this->payload($u, $client))->assertOk();
        $this->assertTrue(Hash::check('Changed123!', $u->fresh()->password));
        $this->assertTrue(Hash::check('Admin123!', $a->fresh()->password));
        $this->postJson($this->endpoint('admin', 'reset-password'), $this->payload($a, $admin))->assertOk();
        $this->assertTrue(Hash::check('Changed123!', $a->fresh()->password));
    }

    public function test_tokens_expire_and_success_consumes_token_without_authenticating(): void
    {
        [$u] = $this->accounts();
        $token = $this->token($u, 'client');
        DB::table('client_password_reset_tokens')->update(['created_at' => now()->subMinutes(61)]);
        $this->postJson($this->endpoint('client', 'reset-password'), $this->payload($u, $token))->assertUnprocessable();
        $this->travel(61)->seconds();
        $new = $this->token($u, 'client');
        $this->postJson($this->endpoint('client', 'reset-password'), $this->payload($u, $new))->assertOk();
        $this->postJson($this->endpoint('client', 'reset-password'), $this->payload($u, $new))->assertUnprocessable();
        $this->assertDatabaseCount('client_password_reset_tokens', 0);
        $this->assertGuest('web');
        $this->assertGuest('admin');
    }

    public function test_resend_is_throttled_then_replaces_old_link_and_unknown_accounts_are_generic(): void
    {
        [$u] = $this->accounts();
        $first = $this->token($u, 'client');
        $response = $this->postJson($this->endpoint('client', 'forgot-password'), ['email' => $u->email])->assertOk();
        Notification::assertSentToTimes($u, AccountPasswordReset::class, 1);
        $unknown = $this->postJson($this->endpoint('client', 'forgot-password'), ['email' => 'unknown@example.test'])->assertOk();
        $this->assertSame($response->json(), $unknown->json());
        $this->travel(61)->seconds();
        $second = $this->token($u, 'client');
        $this->assertNotSame($first, $second);
        $this->postJson($this->endpoint('client', 'reset-password'), $this->payload($u, $first))->assertUnprocessable();
    }

    private function jar($response): array
    {
        return collect($response->headers->getCookies())->mapWithKeys(fn ($cookie) => [$cookie->getName() => $cookie->getValue()])->all();
    }

    public function test_password_version_changes_only_target_area_and_old_credentials_no_longer_login(): void
    {
        config(['session.driver' => 'file']);
        $this->withCredentials();
        [$u, $a] = $this->accounts();
        $client = $this->postJson($this->endpoint('client', 'login'), ['email' => $u->email, 'password' => 'Client123!'])->assertOk();
        $jar = $this->jar($client);
        $admin = $this->withUnencryptedCookies($jar)->postJson($this->endpoint('admin', 'login'), ['email' => $a->email, 'password' => 'Admin123!'])->assertOk();
        $jar = array_replace($jar, $this->jar($admin));
        $this->withUnencryptedCookies($jar);
        $token = $this->token($u, 'client');
        $this->postJson($this->endpoint('client', 'reset-password'), $this->payload($u, $token))->assertOk();
        Auth::forgetGuards();
        $this->getJson($this->endpoint('client', 'me'))->assertUnauthorized();
        $this->getJson($this->endpoint('admin', 'me'))->assertOk();
        $this->assertSame(1, (int) $u->fresh()->auth_version);
        $this->assertSame(0, (int) $a->fresh()->auth_version);
        $this->postJson($this->endpoint('client', 'login'), ['email' => $u->email, 'password' => 'Client123!'])->assertUnauthorized();
        $newClient = $this->postJson($this->endpoint('client', 'login'), ['email' => $u->email, 'password' => 'Changed123!'])->assertOk();
        $jar = array_replace($jar, $this->jar($newClient));
        $this->withUnencryptedCookies($jar);
        $adminToken = $this->token($a, 'admin');
        $this->postJson($this->endpoint('admin', 'reset-password'), $this->payload($a, $adminToken))->assertOk();
        Auth::forgetGuards();
        $this->getJson($this->endpoint('admin', 'me'))->assertUnauthorized();
        $this->getJson($this->endpoint('client', 'me'))->assertOk();
    }
}
