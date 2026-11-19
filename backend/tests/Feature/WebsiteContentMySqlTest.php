<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\WebsiteContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

#[Group('mysql')]
class WebsiteContentMySqlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['foundation.website_url' => 'http://website.localhost']);
    }

    public function test_command_publishes_then_updates_the_same_public_record_without_rebuilding(): void
    {
        $this->getJson('http://website.localhost/api/v1/website/content')->assertOk()->assertExactJson(['data' => null]);
        $this->artisan('website:content', ['title' => 'First title', '--body' => 'First body'])->assertSuccessful();
        $this->getJson('http://website.localhost/api/v1/website/content')->assertOk()->assertJsonPath('data.title', 'First title')->assertJsonCount(3, 'data');
        $this->travel(1)->seconds();
        $this->artisan('website:content', ['title' => 'Second title', '--body' => 'Second body'])->assertSuccessful();
        $response = $this->getJson('http://website.localhost/api/v1/website/content')->assertOk()->assertJsonPath('data.title', 'Second title')->assertJsonPath('data.body', 'Second body');
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $response->json('data.updatedAt'));
        $this->assertDatabaseCount('website_demo_content', 1);
    }

    public function test_clear_removes_only_demo_record_and_preserves_accounts_and_other_rows(): void
    {
        $user = User::factory()->create();
        app(WebsiteContent::class)->publish('Demo', 'Public');
        DB::table('website_demo_content')->insert(['id' => 2, 'title' => 'Other', 'body' => 'Not exposed', 'updated_at' => now()]);
        $this->getJson('http://website.localhost/api/v1/website/content')->assertDontSee('Not exposed');
        $this->artisan('website:content', ['--clear' => true])->assertSuccessful();
        $this->assertDatabaseHas('users', ['id' => $user->id]);
        $this->assertDatabaseHas('website_demo_content', ['id' => 2]);
        $this->getJson('http://website.localhost/api/v1/website/content')->assertOk()->assertExactJson(['data' => null]);
    }
}
