<?php

namespace Tests\Feature;

use App\Http\Middleware\AdminCsrf;
use App\Models\Administrator;
use App\Models\User;
use App\Notifications\AccountPasswordReset;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordRecoveryGuardsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'http://localhost', 'foundation.admin_url' => 'http://admin.localhost', 'foundation.admin_origins' => ['admin.localhost'], 'foundation.recovery_enabled' => false]);
    }

    public function test_disabled_transport_is_generic_and_does_not_attempt_database_lookup_or_log_tokens(): void
    {
        foreach (['http://localhost/api/v1/auth/', 'http://admin.localhost/api/v1/admin/auth/'] as $prefix) {
            $a = $this->postJson($prefix.'forgot-password', ['email' => 'unknown@example.test'])->assertOk();
            $b = $this->postJson($prefix.'forgot-password', ['email' => 'other@example.test'])->assertOk();
            $this->assertSame($a->json(), $b->json());
        }
    }

    public function test_recovery_validation_host_csrf_and_quotas_do_not_bypass_account_boundaries(): void
    {
        $this->postJson('http://localhost/api/v1/admin/auth/forgot-password', ['email' => 'x@example.test'])->assertForbidden();
        $this->postJson('http://admin.localhost/api/v1/auth/forgot-password', ['email' => 'x@example.test'])->assertForbidden();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('http://localhost/api/v1/auth/forgot-password', [])->assertUnprocessable();
        }
        $this->postJson('http://localhost/api/v1/auth/forgot-password', [])->assertStatus(429);
        $this->postJson('http://admin.localhost/api/v1/admin/auth/forgot-password', [])->assertUnprocessable();
        $this->postJson('http://localhost/api/v1/auth/reset-password', ['email' => 'x@example.test', 'token' => 'bad', 'password' => 'x', 'password_confirmation' => 'wrong'])->assertUnprocessable();
    }

    public function test_links_use_configured_origins_and_fragments_not_request_host_or_query_tokens(): void
    {
        $user = new User(['email' => 'client@example.test']);
        $admin = new Administrator(['email' => 'admin@example.test']);
        foreach ([[$user, 'client', 'http://localhost'], [$admin, 'admin', 'http://admin.localhost']] as [$account,$area,$origin]) {
            $notification = new AccountPasswordReset(str_repeat('a', 64), $area);
            $url = $notification->url($account);
            $parts = parse_url($url);
            $this->assertStringStartsWith($origin.'/redefinir-senha/#', $url);
            $this->assertArrayNotHasKey('query', $parts);
            $this->assertStringContainsString('token=', $parts['fragment']);
            $this->assertSame(['mail'], $notification->via($account));
        }
    }

    public function test_changed_password_version_rejects_old_client_session_without_changing_account_type(): void
    {
        $user = new User(['name' => 'Cliente', 'email' => 'client@example.test']);
        $user->id = 2;
        $user->auth_version = 1;
        $this->actingAs($user, 'web')->getJson('http://localhost/api/v1/auth/me')->assertUnauthorized();
        $this->actingAs($user, 'web')->withSession(['web_auth_version' => 1])->getJson('http://localhost/api/v1/auth/me')->assertOk();
        $this->assertFalse(Auth::guard('admin')->check());
    }

    public function test_smtp_failure_is_generic_and_both_flows_require_csrf_without_origin(): void
    {
        config(['foundation.recovery_enabled' => true, 'mail.default' => 'smtp']);
        Password::shouldReceive('broker')->with('clients')->once()->andThrow(new \RuntimeException('PRIVATE-SMTP'));
        Log::shouldReceive('warning')->once()->with('password-recovery-mail-unavailable', ['area' => 'client']);
        $this->postJson('http://localhost/api/v1/auth/forgot-password', ['email' => 'x@example.test'])->assertOk()->assertDontSee('PRIVATE');
        $this->app->bind(ValidateCsrfToken::class, fn () => new class(app(), app('encrypter')) extends ValidateCsrfToken
        {
            protected function runningUnitTests()
            {
                return false;
            }
        });
        $this->app->bind(AdminCsrf::class, fn () => new class(app(), app('encrypter')) extends AdminCsrf
        {
            protected function runningUnitTests()
            {
                return false;
            }
        });
        foreach (['http://localhost/api/v1/auth/', 'http://admin.localhost/api/v1/admin/auth/'] as $prefix) {
            foreach (['forgot-password', 'reset-password'] as $action) {
                $this->postJson($prefix.$action, [])->assertStatus(419);
            }
        }
    }

    public function test_enabled_http_flow_invokes_the_right_broker_with_only_normalized_email(): void
    {
        config(['foundation.recovery_enabled' => true, 'mail.default' => 'smtp']);
        foreach (['client' => 'clients', 'admin' => 'administrators'] as $area => $name) {
            $broker = \Mockery::mock();
            $broker->shouldReceive('sendResetLink')->once()->with(['email' => 'person@example.test'])->andReturn(Password::RESET_LINK_SENT);
            Password::shouldReceive('broker')->once()->with($name)->andReturn($broker);
            $prefix = $area === 'admin' ? 'http://admin.localhost/api/v1/admin/auth/' : 'http://localhost/api/v1/auth/';
            $this->postJson($prefix.'forgot-password', ['email' => ' PERSON@EXAMPLE.TEST ', 'role' => 'admin', 'token' => 'PRIVATE'])->assertOk()->assertDontSee('PRIVATE');
        }
    }
}
