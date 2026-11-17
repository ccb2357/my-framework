<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['client_password_reset_tokens', 'admin_password_reset_tokens'] as $name) {
            Schema::create($name, function (Blueprint $t) {
                $t->string('email', 254)->primary();
                $t->string('token');
                $t->timestamp('created_at')->nullable();
            });
        }
        foreach (['users', 'administrators'] as $name) {
            Schema::table($name, fn (Blueprint $t) => $t->unsignedInteger('auth_version')->default(0));
        }
    }

    public function down(): void
    {
        foreach (['client_password_reset_tokens', 'admin_password_reset_tokens'] as $name) {
            Schema::dropIfExists($name);
        }
        foreach (['users', 'administrators'] as $name) {
            Schema::table($name, fn (Blueprint $t) => $t->dropColumn('auth_version'));
        }
    }
};
