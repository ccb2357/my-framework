<?php

declare(strict_types=1);

try {
    $config = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
    $base = $config['environment'] === 'production' ? $config['url'] : $config['target'];
    $request = static function (string $path, int $expected = 200) use ($config, $base): array {
        $handle = curl_init(rtrim($base, '/').$path);
        curl_setopt_array($handle, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HEADER => true, CURLOPT_HTTPHEADER => ['Host: '.parse_url($config['url'], PHP_URL_HOST), 'Accept: application/json'], CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 20, CURLOPT_FOLLOWLOCATION => false, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
        $response = curl_exec($handle);
        $code = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $size = (int) curl_getinfo($handle, CURLINFO_HEADER_SIZE);
        curl_close($handle);
        if ($response === false || $code !== $expected) {
            throw new RuntimeException('http');
        }

        return [substr($response, 0, $size), substr($response, $size)];
    };
    [$headers, $html] = $request('/');
    if (! str_contains($html, 'name="admin-build" content="'.$config['buildId'].'"') || ! str_contains($html, 'id="admin-app"') || preg_match('/manifest|sw\.js/i', $html)) {
        throw new RuntimeException('html');
    }
    if (! preg_match('/Cache-Control:[^\r\n]*(no-cache|no-store|max-age=0)/i', $headers) || preg_match('/Cache-Control:[^\r\n]*immutable/i', $headers)) {
        throw new RuntimeException('cache');
    }
    foreach ($config['files'] as $file) {
        if ($file === 'index.html') {
            continue;
        }
        if (! preg_match('/^assets\/[\w.-]+\.(js|css)$/', $file)) {
            throw new RuntimeException('asset');
        }
        [$assetHeaders] = $request('/'.$file);
        if (! preg_match('/Cache-Control:[^\r\n]*immutable/i', $assetHeaders)) {
            throw new RuntimeException('asset');
        }
    }
    foreach (['/sw.js', '/manifest.webmanifest', '/offline.html', '/assets/__foundation_missing__.js', '/.env', '/index.php'] as $path) {
        $request($path, in_array($path, ['/.env'], true) ? 403 : 404);
    }
    $request('/api/v1/admin/auth/me', 401);
    $request('/api/v1/auth/me', 403);
    [$headers, $body] = $request('/api/v1/status');
    $status = json_decode($body, true, 32, JSON_THROW_ON_ERROR);
    if (($status['status'] ?? null) !== 'ok' || ($status['checks']['application'] ?? null) !== 'ok' || ($status['checks']['database'] ?? null) !== 'ok' || ! preg_match('/Content-Type:[^\r\n]*application\/json/i', $headers)) {
        throw new RuntimeException('backend');
    }
    [$headers] = $request('/api/v1/__foundation_missing__', 404);
    if (! preg_match('/Content-Type:[^\r\n]*application\/json/i', $headers)) {
        throw new RuntimeException('backend');
    }
    echo json_encode(['status' => 'ok', 'checks' => ['html-build-assets' => 'ok', 'backend' => 'ok', 'no-pwa' => 'ok']], JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    echo json_encode(['status' => 'error']);
    exit(1);
}
