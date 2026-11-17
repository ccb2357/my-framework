<?php

namespace Tests\Feature;

use App\Http\Middleware\AdminCsrf;
use App\Models\Administrator;
use App\Models\User;
use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class AdminAuthGuardsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withCredentials();
        config(['app.url' => 'http://localhost', 'foundation.admin_url' => 'http://admin.localhost', 'foundation.admin_origins' => ['admin.localhost', 'localhost:5182'], 'session.driver' => 'array']);
        $user = new Administrator(['name' => 'Admin', 'email' => 'admin@example.test', 'password' => 'Secret123!']);
        $user->id = 1;
        Auth::provider('admin-fixture', fn () => new class(app('hash'), Administrator::class, $user) extends EloquentUserProvider
        {
            public function __construct($hasher, $model, private $fixture)
            {
                parent::__construct($hasher, $model);
            }

            public function retrieveById($identifier)
            {
                return $identifier == 1 ? $this->fixture : null;
            }

            public function retrieveByCredentials(array $credentials)
            {
                return ($credentials['email'] ?? '') === $this->fixture->email ? $this->fixture : null;
            }

            public function rehashPasswordIfRequired(Authenticatable $user, array $credentials, bool $force = false) {}
        });
        config(['auth.providers.administrators.driver' => 'admin-fixture']);
    }

    private function admin($path)
    {
        return 'http://admin.localhost/api/v1/admin/auth/'.$path;
    }

    private function jar($response): array
    {
        return collect($response->headers->getCookies())->mapWithKeys(fn ($cookie) => [$cookie->getName() => $cookie->getValue()])->all();
    }

    public function test_domains_origins_and_missing_session_cannot_cross_the_boundary(): void
    {
        $this->getJson($this->admin('me'))->assertUnauthorized()->assertHeader('Cache-Control', 'no-store, private');
        $this->getJson('http://localhost/api/v1/admin/auth/me')->assertForbidden();
        $this->getJson($this->admin('me'), ['Origin' => 'http://localhost:5180'])->assertForbidden();
        $this->getJson($this->admin('me'), ['Origin' => 'http://admin.localhost.evil.test'])->assertForbidden();
        $this->getJson('http://admin.localhost/api/v1/auth/me')->assertForbidden();
        $this->getJson('http://admin.localhost/api/v1/push/config')->assertForbidden();
        $this->getJson('http://admin.localhost/sanctum/csrf-cookie')->assertForbidden();
        $this->postJson($this->admin('register'), [])->assertNotFound();
    }

    public function test_cookie_csrf_session_and_password_login_are_isolated_with_real_middleware(): void
    {
        $this->app->bind(AdminCsrf::class, fn () => new class(app(), app('encrypter')) extends AdminCsrf
        {
            protected function runningUnitTests()
            {
                return false;
            }
        });
        $csrf = $this->getJson($this->admin('csrf-cookie'))->assertNoContent();
        $jar = $this->jar($csrf);
        $sessionName = config('session.cookie').'_admin';
        $this->assertArrayHasKey($sessionName, $jar);
        $this->assertArrayHasKey('XSRF-ADMIN-TOKEN', $jar);
        $this->assertArrayNotHasKey('XSRF-TOKEN', $jar);
        foreach ($csrf->headers->getCookies() as $cookie) {
            $this->assertNull($cookie->getDomain());
        }
        $this->withUnencryptedCookies($jar)->postJson($this->admin('login'), ['email' => 'admin@example.test', 'password' => 'Secret123!'])->assertStatus(419);
        $this->withUnencryptedCookies($jar)->postJson($this->admin('login'), [], ['X-XSRF-TOKEN' => $jar['XSRF-ADMIN-TOKEN']])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password']);
        $logged = $this->withUnencryptedCookies($jar)->postJson($this->admin('login'), ['email' => ' ADMIN@EXAMPLE.TEST ', 'password' => 'Secret123!'], ['X-XSRF-TOKEN' => $jar['XSRF-ADMIN-TOKEN']])->assertOk()->assertJsonPath('user.name', 'Admin')->assertJsonCount(3, 'user');
        $loggedJar = $this->jar($logged);
        $this->assertNotSame($jar[$sessionName], $loggedJar[$sessionName]);
        $this->withUnencryptedCookies($loggedJar)->getJson($this->admin('me'))->assertOk();
        $this->withUnencryptedCookies($loggedJar)->getJson('http://localhost/api/v1/auth/me')->assertUnauthorized();
        $this->withUnencryptedCookies($loggedJar)->postJson($this->admin('logout'), [], ['X-XSRF-TOKEN' => $loggedJar['XSRF-ADMIN-TOKEN']])->assertNoContent();
        $this->withUnencryptedCookies($loggedJar)->getJson($this->admin('me'))->assertUnauthorized();
        $this->assertSame('users', config('auth.guards.web.provider'));
        $this->assertSame('administrators', config('auth.guards.admin.provider'));
    }

    public function test_wrong_password_rate_limits_and_errors_remain_controlled(): void
    {
        $this->postJson($this->admin('login'), ['email' => 'admin@example.test', 'password' => 'incorrect'])->assertUnauthorized()->assertDontSee('trace');
        for ($i = 0; $i < 4; $i++) {
            $this->postJson($this->admin('login'), ['email' => 'admin@example.test', 'password' => 'incorrect'])->assertUnauthorized();
        }
        $this->postJson($this->admin('login'), ['email' => 'admin@example.test', 'password' => 'incorrect'])->assertStatus(429);
        $this->getJson($this->admin('csrf-cookie'))->assertNoContent();
        $this->postJson('http://localhost/api/v1/auth/login', [])->assertUnprocessable();
    }

    public function test_browser_cookie_pairs_and_both_logout_directions_preserve_the_other_identity(): void
    {
        $user = new User(['name' => 'Cliente', 'email' => 'client@example.test', 'password' => 'Client123!']);
        $user->id = 2;
        Auth::provider('client-fixture', fn () => new class(app('hash'), User::class, $user) extends EloquentUserProvider
        {
            public function __construct($hasher, $model, private $fixture)
            {
                parent::__construct($hasher, $model);
            }

            public function retrieveById($id)
            {
                return $id == 2 ? $this->fixture : null;
            }

            public function retrieveByCredentials(array $credentials)
            {
                return ($credentials['email'] ?? '') === $this->fixture->email ? $this->fixture : null;
            }

            public function rehashPasswordIfRequired(Authenticatable $user, array $credentials, bool $force = false) {}
        });
        config(['auth.providers.users.driver' => 'client-fixture']);
        Auth::forgetGuards();
        $client = $this->postJson('http://localhost/api/v1/auth/login', ['email' => $user->email, 'password' => 'Client123!'])->assertOk();
        $clientJar = $this->jar($client);
        $admin = $this->withUnencryptedCookies($clientJar)->postJson($this->admin('login'), ['email' => 'admin@example.test', 'password' => 'Secret123!'])->assertOk();
        $both = array_replace($clientJar, $this->jar($admin));
        $this->withUnencryptedCookies($both)->getJson('http://localhost/api/v1/auth/me')->assertOk()->assertJsonPath('user.name', 'Cliente');
        $this->withUnencryptedCookies($both)->getJson($this->admin('me'))->assertOk()->assertJsonPath('user.name', 'Admin');
        $this->withUnencryptedCookies($both)->postJson($this->admin('logout'))->assertNoContent();
        $this->withUnencryptedCookies($both)->getJson('http://localhost/api/v1/auth/me')->assertOk();
        $this->withUnencryptedCookies($both)->getJson($this->admin('me'))->assertUnauthorized();
        $second = $this->withUnencryptedCookies($both)->postJson($this->admin('login'), ['email' => 'admin@example.test', 'password' => 'Secret123!'])->assertOk();
        $both = array_replace($both, $this->jar($second));
        $this->withUnencryptedCookies($both)->postJson('http://localhost/api/v1/auth/logout')->assertNoContent();
        $this->withUnencryptedCookies($both)->getJson($this->admin('me'))->assertOk();
        $this->withUnencryptedCookies($both)->getJson('http://localhost/api/v1/auth/me')->assertUnauthorized();
    }
}
