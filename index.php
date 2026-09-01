<?php

declare(strict_types=1);

/**
 * CSVJSON front controller — static shim.
 *
 * Serves the built SPA from app/dist and applies the legacy URL map.
 * The legacy CodeIgniter app is gone: no server-side conversion, no
 * upload endpoint, no save endpoint, no telemetry, no ad views. Legacy
 * permalink data is read directly from S3 by the browser; nothing is
 * stored server-side.
 *
 * On Apache, real files (img/, favicon.ico) are served before PHP runs and
 * everything else is rewritten here (.htaccess). Under `php -S` this same
 * file acts as the router for every request.
 */

const DIST_DIR = __DIR__ . '/app/dist';

/**
 * Legacy tool slugs. The tool root and every sub-route 301s home, with
 * two carve-outs: /<tool>/<32-hex-id> permalinks stay live (the SPA
 * hydrates them), and the endpoints removed outright below.
 */
const LEGACY_TOOLS = [
    'csv2json',
    'json2csv',
    'json_validator',
    'json_beautifier',
    'sql2json',
    'csvjson2json',
    'datajanitor',
    'dataclean',
];

/**
 * Tools that issued legacy permalinks of the form /<tool>/<32-hex-id>.
 * These URLs are external promises (bookmarks, embeds) and stay live;
 * dataclean was only ever an alias, so its sub-routes redirect.
 */
const PERMALINK_TOOLS = [
    'csv2json', 'json2csv', 'json_validator', 'json_beautifier',
    'sql2json', 'csvjson2json', 'datajanitor',
];

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

function redirect_home(): void
{
    header('Location: /', true, 301);
    exit;
}

function gone(): void
{
    http_response_code(410);
    header('Content-Type: text/html; charset=utf-8');
    exit('<!doctype html><title>410 Gone</title>'
        . '<h1>410 Gone</h1><p><a href="/">Go to the converter</a></p>');
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

// Docroot internals — repo docs, screenshots, dotfiles, build/dep
// metadata — are not public. Under Apache, .htaccess forbids them (403)
// before PHP runs; mirror the same list here so the dev server matches
// production and CI can pin the behavior.
if (preg_match('#^/(?:docs|verification-screenshots)(?:/|$)#', $path)
    || preg_match('#^/\.#', $path)
    || preg_match('#^/(?:composer\.(?:json|lock)|Procfile|ISSUE_TEMPLATE\.md|csvjson\.sublime-\w+)$#', $path)
) {
    not_found();
}

// Under the PHP dev server, hand real docroot files (img/) to the built-in
// server. Under Apache these never reach PHP in the first place.
if (PHP_SAPI === 'cli-server' && $path !== '/' && is_file(__DIR__ . $path)) {
    return false;
}

// Telemetry write and the upload round-trip are removed outright —
// uploads are read client-side and never hit the server.
if (preg_match('#^/(?:' . implode('|', LEGACY_TOOLS) . ')/upload$#i', $path)
    || strtolower($path) === '/csv2json/instrument'
) {
    gone();
}

// Built SPA assets (e.g. /assets/index-abc123.js) live under app/dist, not
// the web root, so this script serves them with the right cache headers.
if (is_file(DIST_DIR . $path)) {
    serve_dist_file($path);
}

if ($path === '/') {
    serve_spa();
}

// The favicon lives at /img/favicon.ico.
if ($path === '/favicon.ico' && is_file(__DIR__ . '/img/favicon.ico')) {
    header('Content-Type: image/x-icon');
    readfile(__DIR__ . '/img/favicon.ico');
    exit;
}

// Legacy permalinks stay live: serve the SPA shell and let the router
// hydrate the stored object read-only from S3 — no redirect, URL unchanged.
if (preg_match('#^/(?:' . implode('|', PERMALINK_TOOLS) . ')/[0-9a-f]{32}/?$#i', $path)) {
    serve_spa();
}

// Everything left on a retired tool URL — root or any sub-route —
// permanently redirects home.
if (preg_match('#^/(?:' . implode('|', LEGACY_TOOLS) . ')(?:/|$)#i', $path)) {
    redirect_home();
}

not_found();
