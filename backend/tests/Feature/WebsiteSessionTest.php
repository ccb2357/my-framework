<?php

namespace Tests\Feature;

use App\Http\Middleware\ClientCsrf;
use App\Models\User;
use App\Notifications\AccountPasswordReset;
use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class WebsiteSessionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withCredentials();
        config(['app.url' => 'http://app.project.localhost', 'foundation.website_url' => 'http://project.localhost', 'foundation.admin_url' => 'http://admin.project.localhost', 'foundation.admin_origins' => ['admin.project.localhost'], 'foundation.client_session_cookie' => 'project_session_client', 'foundation.client_session_domain' => 'project.localhost', 'session.driver' => 'array', 'session.domain' => null, 'sanctum.stateful' => ['app.project.localhost', 'project.localhost', 'localhost:5180', 'localhost:5184']]);
        $user = new User(['name' => 'Cliente', 'email' => 'client@example.test', 'password' => 'Client123!']);
        $user->id = 2;
        Auth::provider('website-fixture', fn () => new class(app('hash'), User::class, $user) extends EloquentUserProvider
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
        config(['auth.providers.users.driver' => 'website-fixture']);
        Auth::forgetGuards();
    }

    private function jar($response): array
    {
        return collect($response->headers->getCookies())->mapWithKeys(fn ($cookie) => [$cookie->getName() => $cookie->getValue()])->all();
    }

    public function test_both_login_and_logout_directions_share_one_client_session(): void
    {
        foreach ([['project.localhost', 'app.project.localhost'], ['app.project.localhost', 'project.localhost']] as [$from, $to]) {
            $response = $this->postJson('http://'.$from.'/api/v1/auth/login', ['email' => 'client@example.test', 'password' => 'Client123!'])->assertOk();
            $jar = $this->jar($response);
            $this->assertArrayHasKey('project_session_client', $jar);
            foreach ($response->headers->getCookies() as $cookie) {
                $this->assertSame('project.localhost', $cookie->getDomain());
            }
            Auth::forgetGuards();
            $this->withUnencryptedCookies($jar)->getJson('http://'.$to.'/api/v1/auth/me')->assertOk()->assertJsonPath('user.id', 2);
            $this->getJson('http://admin.project.localhost/api/v1/auth/me')->assertForbidden();
            $this->getJson('http://'.$to.'/api/v1/admin/auth/me')->assertForbidden();
            $this->postJson('http://'.$to.'/api/v1/auth/logout')->assertNoContent();
            Auth::forgetGuards();
            $this->getJson('http://'.$from.'/api/v1/auth/me')->assertUnauthorized();
            $this->assertNull(config('session.domain'));
        }
    }

    public function test_csrf_domain_localhost_and_foreign_origins_are_enforced(): void
    {
        $this->app->bind(ClientCsrf::class, fn () => new class(app(), app('encrypter')) extends ClientCsrf
        {
            protected function runningUnitTests()
            {
                return false;
            }
        });
        $csrf = $this->getJson('http://project.localhost/sanctum/csrf-cookie')->assertNoContent();
        $jar = $this->jar($csrf);
        $this->assertArrayHasKey('XSRF-CLIENT-TOKEN', $jar);
        $this->withUnencryptedCookies($jar)->postJson('http://project.localhost/api/v1/auth/login', [])->assertStatus(419);
        $this->postJson('http://project.localhost/api/v1/auth/login', [], ['X-XSRF-TOKEN' => $jar['XSRF-CLIENT-TOKEN']])->assertUnprocessable();
        foreach (['http://admin.project.localhost', 'http://evil.test', 'http://project.localhost.evil.test', 'null'] as $origin) {
            $this->getJson('http://project.localhost/api/v1/auth/me', ['Origin' => $origin])->assertForbidden();
        }
        foreach (['Origin', 'Referer'] as $header) {
            $local = $this->getJson('http://project.localhost/sanctum/csrf-cookie', [$header => 'http://localhost:5184/'.($header === 'Referer' ? 'entrar/' : '')])->assertNoContent();
            foreach ($local->headers->getCookies() as $cookie) {
                $this->assertNull($cookie->getDomain());
            }
        }
        $this->app['env'] = 'production';
        $this->getJson('http://project.localhost/api/v1/auth/me', ['Origin' => 'http://project.localhost'])->assertForbidden();
    }

    public function test_website_recovery_link_uses_configured_origin_and_password_changes_end_both_views(): void
    {
        $user = new User(['email' => 'client@example.test']);
        $url = (new AccountPasswordReset(str_repeat('a', 64), 'website'))->url($user);
        $this->assertStringStartsWith('http://project.localhost/redefinir-senha/#token=', $url);
        $this->assertArrayNotHasKey('query', parse_url($url));
        $user->id = 2;
        $user->auth_version = 1;
        foreach (['project.localhost', 'app.project.localhost'] as $host) {
            $this->actingAs($user, 'web')->withSession(['web_auth_version' => 0])->getJson('http://'.$host.'/api/v1/auth/me')->assertUnauthorized();
        }
    }
}
