<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

#[Group('mysql')]
class AdminAuthMySqlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withCredentials();
        config(['app.url' => 'http://localhost', 'foundation.admin_url' => 'http://admin.localhost', 'foundation.admin_origins' => ['admin.localhost'], 'session.driver' => 'file']);
    }

    private function jar($response): array
    {
        return collect($response->headers->getCookies())->mapWithKeys(fn ($c) => [$c->getName() => $c->getValue()])->all();
    }

    public function test_command_creates_one_hashed_administrator_and_never_overwrites_or_creates_clients(): void
    {
        $this->artisan('admin:create', ['email' => ' ADMIN@EXAMPLE.TEST ', '--name' => 'Proprietário'])->expectsQuestion('Senha do administrador', 'Secret123!')->expectsQuestion('Confirme a senha', 'Secret123!')->assertSuccessful();
        $admin = Administrator::firstOrFail();
        $this->assertSame(1, $admin->id);
        $this->assertSame('admin@example.test', $admin->email);
        $this->assertTrue(Hash::check('Secret123!', $admin->password));
        $this->artisan('admin:create', ['email' => 'other@example.test', '--name' => 'Outro'])->assertFailed();
        $this->assertDatabaseCount('administrators', 1);
        $this->assertDatabaseCount('users', 0);
        $this->assertSame($admin->password, $admin->fresh()->password);
    }

    public function test_invalid_password_or_confirmation_leaves_no_administrator(): void
    {
        foreach ([['short', 'short'], ['Secret123!', 'Different123!'], [str_repeat('á', 37), str_repeat('á', 37)]] as [$password,$confirmation]) {
            $this->artisan('admin:create', ['email' => 'admin@example.test', '--name' => 'Admin'])->expectsQuestion('Senha do administrador', $password)->expectsQuestion('Confirme a senha', $confirmation)->assertFailed();
            $this->assertDatabaseCount('administrators', 0);
        }
    }

    public function test_two_real_sessions_cannot_authenticate_or_log_out_each_other_even_on_localhost_ports(): void
    {
        $client = User::factory()->create(['email' => 'same@example.test', 'password' => 'Client123!']);
        $admin = new Administrator(['name' => 'Admin', 'email' => $client->email, 'password' => 'Admin123!']);
        $admin->id = 1;
        $admin->save();
        $clientResponse = $this->postJson('http://localhost/api/v1/auth/login', ['email' => $client->email, 'password' => 'Client123!'])->assertOk();
        $clientJar = $this->jar($clientResponse);
        $adminResponse = $this->withUnencryptedCookies($clientJar)->postJson('http://admin.localhost/api/v1/admin/auth/login', ['email' => $client->email, 'password' => 'Admin123!'])->assertOk();
        $both = array_replace($clientJar, $this->jar($adminResponse));
        $this->withUnencryptedCookies($both)->getJson('http://localhost/api/v1/auth/me')->assertOk()->assertJsonPath('user.name', $client->name);
        $this->withUnencryptedCookies($both)->getJson('http://admin.localhost/api/v1/admin/auth/me')->assertOk()->assertJsonPath('user.name', 'Admin');
        $this->withUnencryptedCookies($both)->postJson('http://admin.localhost/api/v1/admin/auth/logout')->assertNoContent();
        $this->withUnencryptedCookies($both)->getJson('http://localhost/api/v1/auth/me')->assertOk();
        $this->withUnencryptedCookies($both)->getJson('http://admin.localhost/api/v1/admin/auth/me')->assertUnauthorized();
        $second = $this->withUnencryptedCookies($both)->postJson('http://admin.localhost/api/v1/admin/auth/login', ['email' => $client->email, 'password' => 'Admin123!'])->assertOk();
        $both = array_replace($both, $this->jar($second));
        $this->withUnencryptedCookies($both)->postJson('http://localhost/api/v1/auth/logout')->assertNoContent();
        $this->withUnencryptedCookies($both)->getJson('http://admin.localhost/api/v1/admin/auth/me')->assertOk();
        $this->withUnencryptedCookies($both)->getJson('http://localhost/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_client_password_cannot_authenticate_administrator_and_admin_password_cannot_authenticate_client(): void
    {
        User::factory()->create(['email' => 'same@example.test', 'password' => 'Client123!']);
        $a = new Administrator(['name' => 'Admin', 'email' => 'same@example.test', 'password' => 'Admin123!']);
        $a->id = 1;
        $a->save();
        $this->postJson('http://admin.localhost/api/v1/admin/auth/login', ['email' => $a->email, 'password' => 'Client123!'])->assertUnauthorized();
        $this->postJson('http://localhost/api/v1/auth/login', ['email' => $a->email, 'password' => 'Admin123!'])->assertUnauthorized();
    }
}
