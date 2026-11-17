<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Upgrade only: these names identify the retired schema, never a new feature.
        foreach (['jobs', 'failed_jobs'] as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->where('queue', 'push')->delete();
            }
        }
        foreach (['push_test_tokens', 'push_deliveries', 'push_subscriptions'] as $table) {
            Schema::dropIfExists($table);
        }
        if (Schema::hasColumn('users', 'is_push_test')) {
            $ids = DB::table('users')->where('is_push_test', true)->pluck('id');
            if (Schema::hasTable('sessions')) {
                DB::table('sessions')->whereIn('user_id', $ids)->delete();
            }
            DB::table('users')->where('is_push_test', true)->delete();
        }
        foreach (['push_enabled', 'is_push_test'] as $column) {
            if (Schema::hasColumn('users', $column)) {
                Schema::table('users', fn (Blueprint $table) => $table->dropColumn($column));
            }
        }
        DB::table('migrations')->where('migration', '2026_11_13_000001_create_push_tables')->delete();
    }

    public function down(): void
    {
        throw new RuntimeException('Limpeza irreversível: restauração exige backup anterior.');
    }
};
