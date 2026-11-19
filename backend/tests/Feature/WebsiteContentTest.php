<?php

namespace Tests\Feature;

use App\Services\WebsiteContent;
use Illuminate\Session\Middleware\StartSession;
use Tests\TestCase;

class WebsiteContentTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'http://app.project.localhost', 'foundation.website_url' => 'http://project.localhost', 'sanctum.stateful' => ['project.localhost', 'localhost:5184']]);
    }

    public function test_public_read_has_no_session_cookie_and_returns_empty_or_public_resource(): void
    {
        $this->app->bind(StartSession::class, fn () => throw new \RuntimeException('PRIVATE-SESSION'));
        $this->mock(WebsiteContent::class)->shouldReceive('read')->once()->andReturn(null);
        $response = $this->getJson('http://project.localhost/api/v1/website/content')->assertOk()->assertExactJson(['data' => null])->assertHeader('Cache-Control');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertCount(0, $response->headers->getCookies());
    }

    public function test_public_endpoint_respects_host_origin_and_method_boundaries(): void
    {
        $this->mock(WebsiteContent::class)->shouldNotReceive('read');
        foreach (['app.project.localhost', 'admin.project.localhost', 'foreign.test'] as $host) {
            $this->getJson('http://'.$host.'/api/v1/website/content')->assertForbidden()->assertDontSee('trace');
        }
        foreach (['http://evil.test', 'http://user@project.localhost', 'http://project.localhost/path', 'null'] as $origin) {
            $this->getJson('http://project.localhost/api/v1/website/content', ['Origin' => $origin])->assertForbidden();
        }
        $this->postJson('http://project.localhost/api/v1/website/content', ['title' => 'Unauthorized'])->assertStatus(405);
        $this->app['env'] = 'production';
        $this->getJson('http://project.localhost/api/v1/website/content', ['Origin' => 'http://project.localhost'])->assertForbidden();
    }

    public function test_database_failure_is_controlled_and_does_not_become_empty_or_cached_success(): void
    {
        $this->mock(WebsiteContent::class)->shouldReceive('read')->once()->andThrow(new \RuntimeException('PRIVATE-CONNECTION'));
        $response = $this->getJson('http://project.localhost/api/v1/website/content')->assertStatus(503)->assertHeader('Cache-Control')->assertExactJson(['message' => 'Conteúdo temporariamente indisponível.']);
        $response->assertDontSee('PRIVATE')->assertDontSee('trace');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertCount(0, $response->headers->getCookies());
    }

    public function test_invalid_command_never_writes_and_failure_output_is_controlled(): void
    {
        $this->mock(WebsiteContent::class)->shouldNotReceive('publish')->shouldNotReceive('clear');
        foreach ([[], ['title' => 'Title'], ['title' => str_repeat('x', 161), '--body' => 'Body'], ['title' => 'Title', '--body' => 'Body', '--clear' => true]] as $arguments) {
            $this->artisan('website:content', $arguments)->assertExitCode(2);
        }
    }
}
