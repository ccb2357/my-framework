<?php

declare(strict_types=1);

try {
    $config = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
    $base = $config['environment'] === 'production' ? $config['url'] : $config['target'];
    $request = static function (string $path) use ($base, $config): array {
        $handle = curl_init(rtrim($base, '/').$path);
        curl_setopt_array($handle, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HEADER => true, CURLOPT_HTTPHEADER => ['Host: '.parse_url($config['url'], PHP_URL_HOST)], CURLOPT_CONNECTTIMEOUT => 2, CURLOPT_TIMEOUT => 7, CURLOPT_FOLLOWLOCATION => false, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
        $response = curl_exec($handle);
        $code = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $size = (int) curl_getinfo($handle, CURLINFO_HEADER_SIZE);
        curl_close($handle);
        if ($response === false || $code !== 200 || !preg_match('/Cache-Control:[^\r\n]*no-store/i', $response)) {
            throw new RuntimeException('website');
        }
        return [substr($response, 0, $size), substr($response, $size)];
    };
    [, $html] = $request('/');
    if (!str_contains($html, 'name="website-build" content="'.$config['buildId'].'"') || !str_contains($html, 'data-website-hello') || !str_contains($html, 'data-dynamic-content')) {
        throw new RuntimeException('website');
    }
    [$headers, $body] = $request('/_content');
    $json = json_decode($body, true, 16, JSON_THROW_ON_ERROR);
    if (!preg_match('/Content-Type:\s*application\/json/i', $headers) || preg_match('/Set-Cookie:/i', $headers) || !is_array($json) || array_keys($json) !== ['data']) {
        throw new RuntimeException('content');
    }
    if ($json['data'] !== null) {
        $item = $json['data'];
        if (!is_array($item) || array_keys($item) !== ['title', 'body', 'updatedAt'] || !is_string($item['title']) || trim($item['title']) === '' || mb_strlen($item['title']) > 160 || !is_string($item['body']) || trim($item['body']) === '' || mb_strlen($item['body']) > 2000 || !is_string($item['updatedAt']) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $item['updatedAt'])) {
            throw new RuntimeException('content');
        }
    }
    echo json_encode(['status' => 'ok', 'checks' => ['ssr-build' => 'ok', 'public-content' => 'ok']], JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    echo json_encode(['status' => 'error']);
    exit(1);
}
