<?php

return [
    'recovery_enabled' => (bool) env('RECOVERY_ENABLED', false),
    'admin_url' => env('ADMIN_URL'),
    'admin_origins' => array_values(array_filter(explode(',', (string) env('ADMIN_STATEFUL_DOMAINS', '')))),
    'main_database' => env('FOUNDATION_MAIN_DATABASE'),
    'test_database' => env('FOUNDATION_TEST_DATABASE'),
    'environment' => env('FOUNDATION_ENV'),
];
