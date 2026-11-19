<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class WebsiteContent
{
    public function read(): ?array
    {
        $row = DB::table('website_demo_content')->where('id', 1)->first(['title', 'body', 'updated_at']);
        if ($row === null) {
            return null;
        }

        return ['title' => $row->title, 'body' => $row->body, 'updatedAt' => CarbonImmutable::parse($row->updated_at, config('app.timezone'))->utc()->format('Y-m-d\TH:i:s\Z')];
    }

    public function publish(string $title, string $body): void
    {
        DB::table('website_demo_content')->upsert([['id' => 1, 'title' => $title, 'body' => $body, 'updated_at' => now()]], ['id'], ['title', 'body', 'updated_at']);
    }

    public function clear(): void
    {
        DB::table('website_demo_content')->where('id', 1)->delete();
    }
}
