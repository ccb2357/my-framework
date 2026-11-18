<?php

declare(strict_types=1);

try {
    $config = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
    $base = $config['environment'] === 'production' ? $config['url'] : $config['target'];
    $handle = curl_init(rtrim($base, '/').'/');
    curl_setopt_array($handle, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HEADER => true, CURLOPT_HTTPHEADER => ['Host: '.parse_url($config['url'], PHP_URL_HOST)], CURLOPT_CONNECTTIMEOUT => 2, CURLOPT_TIMEOUT => 5, CURLOPT_FOLLOWLOCATION => false, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
    $response = curl_exec($handle);
    $code = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    curl_close($handle);
    if ($response === false || $code !== 200 || ! str_contains($response, 'name="website-build" content="'.$config['buildId'].'"') || ! str_contains($response, 'data-website-hello') || ! preg_match('/Cache-Control:[^\r\n]*no-store/i', $response)) {
        throw new RuntimeException('website');
    }
    echo json_encode(['status' => 'ok', 'checks' => ['ssr-build' => 'ok']], JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    echo json_encode(['status' => 'error']);
    exit(1);
}
