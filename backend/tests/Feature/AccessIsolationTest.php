<?php

namespace Tests\Feature;

use App\Models\Administrator;
use Tests\TestCase;

class AccessIsolationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'http://localhost', 'foundation.admin_url' => 'http://admin.localhost', 'sanctum.stateful' => ['localhost', 'localhost:5180', 'localhost:5181']]);
    }

    public function test_all_client_session_entry_points_reject_foreign_hosts_and_origins(): void
    {
        foreach (['api/v1/auth/me', 'sanctum/csrf-cookie'] as $path) {
            foreach (['admin.localhost', 'foreign.example'] as $host) {
                $this->getJson('http://'.$host.'/'.$path)->assertForbidden()->assertDontSee('trace');
            }
            foreach (['http://admin.localhost', 'http://foreign.example', 'null', 'http://localhost/path', 'http://user@localhost', 'http://localhost:9999'] as $origin) {
                $this->withHeader('Origin', $origin)->getJson('http://localhost/'.$path)->assertForbidden();
            }
        }
    }

    public function test_configured_dev_and_preview_origins_keep_csrf_and_guest_contracts(): void
    {
        foreach (['http://localhost:5180', 'http://localhost:5181'] as $origin) {
            $this->withHeader('Origin', $origin)->getJson('http://localhost/sanctum/csrf-cookie')->assertNoContent();
            $this->getJson('http://localhost/api/v1/auth/me')->assertUnauthorized();
        }
    }

    public function test_production_rejects_plain_http_origin_for_every_client_entry_point(): void
    {
        $this->app['env'] = 'production';
        foreach (['api/v1/auth/me', 'sanctum/csrf-cookie'] as $path) {
            $this->withHeader('Origin', 'http://localhost')->getJson('http://localhost/'.$path)->assertForbidden();
        }
    }

    public function test_administrator_model_cannot_become_a_client_identity(): void
    {
        $admin = new Administrator(['name' => 'Admin', 'email' => 'admin@example.test']);
        $admin->id = 1;
        foreach (['api/v1/auth/me'] as $path) {
            $this->actingAs($admin, 'web')->getJson('http://localhost/'.$path)->assertUnauthorized();
        }
    }
}
