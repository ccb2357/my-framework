<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

#[Group('mysql')]
class RetiredModuleMigrationTest extends TestCase
{
    public function test_clean_install_and_legacy_cleanup_preserve_real_accounts_and_other_queues(): void
    {
        // TestingDatabaseGuard has already authorized only the exclusive testing DB.
        $this->artisan('migrate:fresh', ['--force' => true])->assertSuccessful();
        try {
            $user = User::factory()->create();
            $admin = new Administrator(['name' => 'Admin', 'email' => 'admin@example.test', 'password' => 'Secret123!']);
            $admin->id = 1;
            $admin->save();
            $migration = require database_path('migrations/2026_11_17_000001_remove_retired_module.php');
            $migration->up();
            $this->assertDatabaseHas('users', ['id' => $user->id]);
            Schema::table('users', function (Blueprint $table): void {
                $table->boolean('is_push_test')->default(false);
                $table->boolean('push_enabled')->default(false);
            });
            $test = User::factory()->create();
            DB::table('users')->where('id', $test->id)->update(['is_push_test' => true]);
            foreach (['push_test_tokens', 'push_deliveries', 'push_subscriptions'] as $table) {
                Schema::create($table, fn (Blueprint $schema) => $schema->id());
            }
            foreach (['push', 'product'] as $queue) {
                DB::table('jobs')->insert(['queue' => $queue, 'payload' => '{}', 'attempts' => 0, 'reserved_at' => null, 'available_at' => time(), 'created_at' => time()]);
            }
            $migration->up();
            $migration->up();
            $this->assertDatabaseHas('users', ['id' => $user->id]);
            $this->assertDatabaseMissing('users', ['id' => $test->id]);
            $this->assertDatabaseHas('administrators', ['id' => 1, 'email' => $admin->email]);
            $this->assertDatabaseHas('jobs', ['queue' => 'product']);
            $this->assertDatabaseMissing('jobs', ['queue' => 'push']);
            foreach (['push_test_tokens', 'push_deliveries', 'push_subscriptions'] as $table) {
                $this->assertFalse(Schema::hasTable($table));
            }
            $this->assertFalse(Schema::hasColumn('users', 'is_push_test'));
            $this->assertFalse(Schema::hasColumn('users', 'push_enabled'));
        } finally {
            $this->artisan('migrate:fresh', ['--force' => true])->assertSuccessful();
        }
    }
}
