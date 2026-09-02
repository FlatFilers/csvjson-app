<?php

declare(strict_types=1);

/**
 * POST /api/feedback — the site's one sanctioned write path (spec: CSVJSON
 * feedback votes, art_2AdAvo34). Required by the index.php front controller
 * when the request path is /api/feedback, so it runs identically under
 * Apache (.htaccess rewrite) and `php -S` — CI's smoke test exercises the
 * real code path.
 *
 * Contract: 204 recorded · 400 malformed JSON · 422 validation failure
 * · 429 rate limited (10 writes / ip_hash / 24h; 600/hour global)
 * · 503 storage not configured/unreachable · 405 non-POST · 403 cross-origin.
 * Server-side derived fields: ip_hash (HMAC-SHA256 of the client IP with
 * FEEDBACK_SALT, truncated to 16 bytes — the raw IP is never stored) and
 * the timestamps. The vote row upserts on client_id: one row per browser,
 * vote changes update it, switching to an upvote clears the reason.
 */

require_once __DIR__ . '/feedback-db.php';

/**
 * Respond with a JSON error body (204 sends no body) and stop. Header()
 * after http_response_code() so the status is authoritative.
 */
function feedback_respond(int $status, ?array $payload = null): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    if ($payload !== null) {
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
    exit;
}

/**
 * Same-origin check on the Origin header. Browsers always send Origin on
 * cross-site and most same-site POSTs; non-browser clients (curl, CI) may
 * omit it — absence is allowed, a mismatched host is a 403.
 */
function feedback_origin_allowed(?string $origin): bool
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
    // Compare ports only when the origin carries one (default ports are
    // elided by browsers and by HTTP_HOST alike).
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
 * Validate the request body. Returns the sanitized write values; any
 * invalid value responds 422 and exits instead of returning. Strict: vote
 * must be a JSON number 1|-1, the reason enum is exact, and text caps are
 * character counts.
 *
 * @return array{client_id: string, vote: int, reason_code: ?string, reason_text: ?string, page_path: ?string}
 */
function feedback_validated_body(mixed $body): array
{
    $clientId = $body['clientId'] ?? null;
    if (!is_string($clientId)
        || preg_match('/^[0-9a-fA-F-]{8,' . FEEDBACK_MAX_CLIENT_ID_CHARS . '}$/', $clientId) !== 1
    ) {
        feedback_respond(422, ['error' => 'invalid_client_id']);
    }

    $vote = $body['vote'] ?? null;
    if (!in_array($vote, [1, -1], true)) {
        feedback_respond(422, ['error' => 'invalid_vote']);
    }

    $reasonCode = $body['reasonCode'] ?? null;
    $reasonText = $body['reasonText'] ?? null;
    if ($vote === -1) {
        // A downvote must say why: exactly one of the six enum chips.
        if (!is_string($reasonCode) || !in_array($reasonCode, FEEDBACK_REASONS, true)) {
            feedback_respond(422, ['error' => 'invalid_reason']);
        }
        if ($reasonText !== null) {
            if (!is_string($reasonText) || mb_strlen($reasonText) > FEEDBACK_MAX_REASON_CHARS) {
                feedback_respond(422, ['error' => 'invalid_reason_text']);
            }
            $reasonText = $reasonText !== '' ? $reasonText : null;
        } else {
            $reasonText = null;
        }
    } else {
        // Upvotes carry no reason — switching from a downvote clears it.
        $reasonCode = null;
        $reasonText = null;
    }

    $path = $body['path'] ?? null;
    if ($path === '') {
        $path = null;
    }
    if ($path !== null && (!is_string($path) || mb_strlen($path) > FEEDBACK_MAX_PATH_CHARS)) {
        feedback_respond(422, ['error' => 'invalid_path']);
    }

    return [
        'client_id' => $clientId,
        'vote' => $vote,
        'reason_code' => $reasonCode,
        'reason_text' => $reasonText,
        'page_path' => $path,
    ];
}

// ---------------------------------------------------------------------------
// Request handling (this file is required by the front controller)
// ---------------------------------------------------------------------------

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    feedback_respond(405, ['error' => 'method_not_allowed']);
}

if (!feedback_origin_allowed(is_string($_SERVER['HTTP_ORIGIN'] ?? null) ? $_SERVER['HTTP_ORIGIN'] : null)) {
    feedback_respond(403, ['error' => 'forbidden_origin']);
}

$pdo = feedback_db_connect();
if ($pdo === null) {
    feedback_respond(503, ['error' => 'storage_not_configured']);
}
if (!is_string(getenv('FEEDBACK_SALT')) || getenv('FEEDBACK_SALT') === '') {
    feedback_respond(503, ['error' => 'storage_not_configured']);
}
feedback_ensure_schema($pdo);

$raw = file_get_contents('php://input');
$body = json_decode(is_string($raw) ? $raw : '', true);
if (!is_array($body)) {
    feedback_respond(400, ['error' => 'malformed_json']);
}

$write = feedback_validated_body($body);

$ipHash = feedback_ip_hash(feedback_client_ip());

try {
    $pdo->beginTransaction();

    // Log the attempt first: the limit checks below include this very write,
    // so the 11th write from an ip_hash inside 24h (or the 601st globally
    // inside an hour) trips its cap. Over-limit attempts roll back, leaving
    // no trace in the log.
    $insert = $pdo->prepare('INSERT INTO feedback_write_log (ip_hash) VALUES (:ip_hash)');
    $insert->execute([':ip_hash' => $ipHash]);

    $perIp = $pdo->prepare(
        "SELECT COUNT(*) FROM feedback_write_log
         WHERE ip_hash = :ip_hash AND created_at > now() - interval '24 hours'"
    );
    $perIp->execute([':ip_hash' => $ipHash]);
    if ((int) $perIp->fetchColumn() > FEEDBACK_IP_WRITES_PER_DAY) {
        $pdo->rollBack();
        feedback_respond(429, ['error' => 'rate_limited']);
    }

    $global = $pdo->prepare(
        "SELECT COUNT(*) FROM feedback_write_log WHERE created_at > now() - interval '1 hour'"
    );
    $global->execute();
    if ((int) $global->fetchColumn() > FEEDBACK_GLOBAL_WRITES_PER_HOUR) {
        $pdo->rollBack();
        feedback_respond(429, ['error' => 'rate_limited']);
    }

    $upsert = $pdo->prepare(
        'INSERT INTO feedback_votes (client_id, vote, reason_code, reason_text, page_path, ip_hash)
         VALUES (:client_id, :vote, :reason_code, :reason_text, :page_path, :ip_hash)
         ON CONFLICT (client_id) DO UPDATE SET
             vote        = EXCLUDED.vote,
             reason_code = EXCLUDED.reason_code,
             reason_text = EXCLUDED.reason_text,
             page_path   = EXCLUDED.page_path,
             updated_at  = now()'
    );
    $upsert->execute([
        ':client_id' => $write['client_id'],
        ':vote' => $write['vote'],
        ':reason_code' => $write['reason_code'],
        ':reason_text' => $write['reason_text'],
        ':page_path' => $write['page_path'],
        ':ip_hash' => $ipHash,
    ]);

    $pdo->commit();
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('feedback: write failed: ' . get_class($e));
    feedback_respond(503, ['error' => 'storage_unavailable']);
}

feedback_respond(204);
