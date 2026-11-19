<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('website_demo_content', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->string('title', 160);
            $table->text('body');
            $table->timestamp('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_demo_content');
    }
};
