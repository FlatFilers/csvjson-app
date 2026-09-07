<?php

declare(strict_types=1);

/**
 * POST /api/changelog-vote — the changelog widget's write path (spec: CSVJSON
 * changelog widget, art_YzASNds2). Required by the index.php front controller
 * when the request path is /api/changelog-vote, so it runs identically under
 * Apache (.htaccess rewrite) and `php -S` — CI's smoke test exercises the
 * real code path.
 *
 * Contract: 204 recorded · 400 malformed JSON · 422 validation failure
 * · 429 rate limited (shared with /api/feedback: 10 writes / ip_hash / 24h;
 * 600/hour global) · 503 storage not configured/unreachable · 405 non-POST
 * · 403 cross-origin. The ip_hash is the same HMAC-SHA256(IP, FEEDBACK_SALT)
 * truncated to 16 bytes as the feedback endpoint — the raw IP is never
 * stored. One changeable vote per browser per entry: the row upserts on
 * (client_id, entry_id), so a changed vote updates it in place.
 */

require_once __DIR__ . '/feedback-db.php';
require_once __DIR__ . '/changelog-db.php';

/**
 * Respond with a JSON error body (204 sends no body) and stop. Header()
 * after http_response_code() so the status is authoritative.
 */
function changelog_respond(int $status, ?array $payload = null): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    if ($payload !== null) {
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
    exit;
}

/**
 * Same-origin check, identical to the feedback endpoint's: browsers send
 * Origin on most POSTs; non-browser clients may omit it — absence is
 * allowed, a mismatched host is a 403.
 */
function changelog_origin_allowed(?string $origin): bool
{
    if ($origin === null || $origin === '') {
        return true;
    }
    $host = is_string($_SERVER['HTTP_HOST'] ?? null) ? $_SERVER['HTTP_HOST'] : '';
    if ($host === '') {
        return false;
    }
    $parts = parse_url($origin);
    if (!is_array($parts) || !isset($parts['host'], $parts['scheme'])) {
        return false;
    }
    $requestHost = strtolower(preg_replace('/:\d+$/', '', $host) ?? '');
    if (strtolower($parts['host']) !== $requestHost) {
        return false;
    }
    if (!isset($parts['port'])) {
        return true;
    }
    if (preg_match('/:(\d+)$/', $host, $m) === 1) {
        $hostPort = (int) $m[1];
    } else {
        $hostPort = strtolower($parts['scheme']) === 'https' ? 443 : 80;
    }
    return $parts['port'] === $hostPort;
}

/**
 * Validate the request body. The client id must be a UUID (the widget
 * generates one with crypto.randomUUID and the column is a real Postgres
 * UUID — a looser string would die in the insert, so it is rejected here
 * as 422 instead); entryId must be a known-shape positive integer; vote
 * must be the JSON number 1 or -1. Any invalid value responds 422 and
 * exits instead of returning.
 *
 * @return array{client_id: string, entry_id: int, vote: int}
 */
function changelog_validated_body(mixed $body): array
{
    $clientId = $body['clientId'] ?? null;
    if (!is_string($clientId)
        || preg_match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/', $clientId) !== 1
    ) {
        changelog_respond(422, ['error' => 'invalid_client_id']);
    }

    $entryId = $body['entryId'] ?? null;
    if (!is_int($entryId) || $entryId < 1 || $entryId > CHANGELOG_MAX_ENTRY_ID) {
        changelog_respond(422, ['error' => 'invalid_entry_id']);
    }

    $vote = $body['vote'] ?? null;
    if (!in_array($vote, [1, -1], true)) {
        changelog_respond(422, ['error' => 'invalid_vote']);
    }

    return [
        'client_id' => $clientId,
        'entry_id' => $entryId,
        'vote' => $vote,
    ];
}

// ---------------------------------------------------------------------------
// Request handling (this file is required by the front controller)
// ---------------------------------------------------------------------------

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    changelog_respond(405, ['error' => 'method_not_allowed']);
}

if (!changelog_origin_allowed(is_string($_SERVER['HTTP_ORIGIN'] ?? null) ? $_SERVER['HTTP_ORIGIN'] : null)) {
    changelog_respond(403, ['error' => 'forbidden_origin']);
}

$pdo = feedback_db_connect();
if ($pdo === null) {
    changelog_respond(503, ['error' => 'storage_not_configured']);
}
if (!is_string(getenv('FEEDBACK_SALT')) || getenv('FEEDBACK_SALT') === '') {
    changelog_respond(503, ['error' => 'storage_not_configured']);
}
changelog_ensure_schema($pdo);
// The rate-limit table both vote endpoints share: bootstrap it here too so
// the first vote on a fresh database never depends on /api/feedback having
// run first.
feedback_ensure_write_log($pdo);

$raw = file_get_contents('php://input');
$body = json_decode(is_string($raw) ? $raw : '', true);
if (!is_array($body)) {
    changelog_respond(400, ['error' => 'malformed_json']);
}

$write = changelog_validated_body($body);

$ipHash = feedback_ip_hash(feedback_client_ip());

try {
    $pdo->beginTransaction();

    // Shared write log (feedback-db.php): the limit checks below include
    // this very write, so the 11th write from an ip_hash inside 24h (or
    // the 601st globally inside an hour, feedback + changelog together)
    // trips its cap. Over-limit attempts roll back, leaving no trace.
    $insert = $pdo->prepare('INSERT INTO feedback_write_log (ip_hash) VALUES (:ip_hash)');
    $insert->execute([':ip_hash' => $ipHash]);

    $perIp = $pdo->prepare(
        "SELECT COUNT(*) FROM feedback_write_log
         WHERE ip_hash = :ip_hash AND created_at > now() - interval '24 hours'"
    );
    $perIp->execute([':ip_hash' => $ipHash]);
    if ((int) $perIp->fetchColumn() > FEEDBACK_IP_WRITES_PER_DAY) {
        $pdo->rollBack();
        changelog_respond(429, ['error' => 'rate_limited']);
    }

    $global = $pdo->prepare(
        "SELECT COUNT(*) FROM feedback_write_log WHERE created_at > now() - interval '1 hour'"
    );
    $global->execute();
    if ((int) $global->fetchColumn() > FEEDBACK_GLOBAL_WRITES_PER_HOUR) {
        $pdo->rollBack();
        changelog_respond(429, ['error' => 'rate_limited']);
    }

    // One changeable vote per browser per entry (spec): the unique pair
    // (client_id, entry_id) makes the insert idempotent and the update
    // in place — never a second row.
    $upsert = $pdo->prepare(
        'INSERT INTO changelog_votes (client_id, entry_id, vote, ip_hash)
         VALUES (:client_id, :entry_id, :vote, :ip_hash)
         ON CONFLICT (client_id, entry_id) DO UPDATE SET
             vote = EXCLUDED.vote'
    );
    $upsert->execute([
        ':client_id' => $write['client_id'],
        ':entry_id' => $write['entry_id'],
        ':vote' => $write['vote'],
        ':ip_hash' => $ipHash,
    ]);

    $pdo->commit();
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('changelog: write failed: ' . get_class($e));
    changelog_respond(503, ['error' => 'storage_unavailable']);
}

changelog_respond(204);
