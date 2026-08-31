<?php

declare(strict_types=1);

/**
 * CSVJSON front controller — static shim.
 *
 * Serves the built SPA from app/dist. The legacy CodeIgniter app is gone:
 * no server-side conversion, no upload endpoint, no save endpoint, no
 * telemetry, no ad views. Legacy permalink data is read directly from S3
 * by the browser; nothing is stored server-side.
 *
 * On Apache, real files (img/, favicon.ico) are served before PHP runs and
 * everything else is rewritten here (.htaccess). Under `php -S` this same
 * file acts as the router for every request.
 */

const DIST_DIR = __DIR__ . '/app/dist';

/**
 * Content-Type for a file served out of the SPA build.
 */
function dist_mime_type(string $file): string
{
    static $types = [
        'html' => 'text/html; charset=utf-8',
        'htm' => 'text/html; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'js' => 'text/javascript; charset=utf-8',
        'mjs' => 'text/javascript; charset=utf-8',
        'json' => 'application/json',
        'map' => 'application/json',
        'webmanifest' => 'application/json',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'ico' => 'image/x-icon',
        'txt' => 'text/plain; charset=utf-8',
        'xml' => 'application/xml',
        'woff2' => 'font/woff2',
        'woff' => 'font/woff',
        'wasm' => 'application/wasm',
    ];

    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));

    return $types[$ext] ?? 'application/octet-stream';
}

/**
 * Serve one file from the SPA build, refusing anything outside app/dist.
 */
function serve_dist_file(string $path): void
{
    $root = realpath(DIST_DIR);
    $file = realpath(DIST_DIR . $path);
    if ($root === false || $file === false || strpos($file, $root . DIRECTORY_SEPARATOR) !== 0 || !is_file($file)) {
        not_found();
    }

    header('Content-Type: ' . dist_mime_type($file));
    // Vite fingerprints its assets, so hashed files cache forever while
    // index.html must revalidate on every visit so deploys propagate.
    header('Cache-Control: ' . (preg_match('/-[A-Za-z0-9_-]{8,}\.\w+$/', $file)
        ? 'public, max-age=31536000, immutable'
        : 'no-cache'));
    readfile($file);
    exit;
}

/**
 * Serve the SPA shell for "/" and for legacy permalink URLs, which the
 * client-side router hydrates (read-only) straight from S3 — no redirect.
 */
function serve_spa(): void
{
    if (!is_file(DIST_DIR . '/index.html')) {
        // The SPA build ships separately from this shim; without it there
        // is nothing to serve.
        http_response_code(503);
        header('Content-Type: text/plain; charset=utf-8');
        exit('The application build is not available.');
    }
    serve_dist_file('/index.html');
}

function not_found(): void
{
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    exit('<!doctype html><title>404 Not Found</title>'
        . '<h1>404 Not Found</h1><p><a href="/">Go to the converter</a></p>');
}

// ---------------------------------------------------------------------------
// Request routing
// ---------------------------------------------------------------------------

$rawPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = rawurldecode(is_string($rawPath) && $rawPath !== '' ? $rawPath : '/');

// Normalize: a trailing slash changes nothing.
if ($path !== '/') {
    $path = rtrim($path, '/');
    if ($path === '') {
        $path = '/';
    }
}

// Refuse anything that tries to escape the document root.
if (strpos($path, "\0") !== false || strpos($path, '..') !== false) {
    not_found();
}

// Under the PHP dev server, hand real docroot files (img/) to the built-in
// server. Under Apache these never reach PHP in the first place.
if (PHP_SAPI === 'cli-server' && $path !== '/' && is_file(__DIR__ . $path)) {
    return false;
}

if ($path === '/') {
    serve_spa();
}

// Built SPA assets (e.g. /assets/index-abc123.js) live under app/dist, not
// the web root, so this script serves them with the right cache headers.
if (is_file(DIST_DIR . $path)) {
    serve_dist_file($path);
}

// The favicon lives at /img/favicon.ico.
if ($path === '/favicon.ico' && is_file(__DIR__ . '/img/favicon.ico')) {
    header('Content-Type: image/x-icon');
    readfile(__DIR__ . '/img/favicon.ico');
    exit;
}

not_found();
