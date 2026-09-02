<?php

declare(strict_types=1);

/**
 * Shared plumbing for the feedback vote feature (spec: CSVJSON feedback
 * votes, art_2AdAvo34): the storage connection, the auto-created schema,
 * and the salted truncated IP hash. Required by both feedback-api.php
 * (POST /api/feedback) and feedback-admin.php (/feedback-admin) — the only
 * sanctioned write path on the site. Defines functions only; including it
 * has no side effects, so scripts (CI smoke) can call the helpers directly.
 *
 * Storage is any Postgres reachable via DATABASE_URL (Heroku Postgres or a
 * Neon project — same code either way). Tables self-create on first use:
 * there is no migration step.
 */

const FEEDBACK_REASONS = [
    'wrong_output',
    'hard_to_use',
    'missing_feature',
    'slower',
    'looks_worse',
    'other',
];
const FEEDBACK_MAX_REASON_CHARS = 500;
const FEEDBACK_MAX_PATH_CHARS = 128;
const FEEDBACK_MAX_CLIENT_ID_CHARS = 64;
/** Rate limits (spec: 10 writes / ip_hash / 24h; 600/hour global cap). */
const FEEDBACK_IP_WRITES_PER_DAY = 10;
const FEEDBACK_GLOBAL_WRITES_PER_HOUR = 600;

/**
 * Connect to the feedback Postgres store. Returns null when the storage is
 * not configured or unreachable — callers decide the failure surface
 * (API: 503 JSON, admin: 503 page, CI: retry loop). Never throws.
 */
function feedback_db_connect(): ?PDO
{
    $url = getenv('DATABASE_URL');
    if ($url === false || $url === '') {
        return null;
    }

    // Heroku-style DATABASE_URL (postgres://user:pass@host:port/dbname) →
    // a libpq DSN. This is the pattern the Heroku PHP docs use; it works
    // unchanged for Neon (TLS is negotiated by libpq's default sslmode).
    $parts = parse_url($url);
    if ($parts === false || !isset($parts['host'], $parts['path'])) {
        return null;
    }
    $dbname = ltrim($parts['path'], '/');
    if ($dbname === '') {
        return null;
    }
    $dsn = sprintf(
        'pgsql:host=%s;port=%d;dbname=%s',
        $parts['host'],
        $parts['port'] ?? 5432,
        $dbname
    );

    try {
        return new PDO($dsn, $parts['user'] ?? null, $parts['pass'] ?? null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // A feedback vote must never hang the page header: fail fast.
            PDO::ATTR_TIMEOUT => 5,
        ]);
    } catch (PDOException $e) {
        // The raw error can carry credentials from the DSN — log only its class.
        error_log('feedback: db connect failed: ' . get_class($e));
        return null;
    }
}

/**
 * The vote store (schema fixed by the spec) plus the write log that backs
 * the rate limits — a rate limit counts writes, not surviving rows, so
 * upsert-heavy vote switching cannot evade it and rejected writes are not
 * logged (the transaction rolls the attempt back before responding 429).
 */
function feedback_ensure_schema(PDO $pdo): void
{
    $pdo->exec('CREATE TABLE IF NOT EXISTS feedback_votes (
        id          BIGSERIAL PRIMARY KEY,
        client_id   TEXT        NOT NULL UNIQUE,
        vote        SMALLINT    NOT NULL CHECK (vote IN (1, -1)),
        reason_code TEXT        CHECK (reason_code IN
                    (\'wrong_output\',\'hard_to_use\',\'missing_feature\',\'slower\',\'looks_worse\',\'other\')),
        reason_text TEXT        CHECK (char_length(reason_text) <= 500),
        page_path   TEXT,
        ip_hash     TEXT        NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )');
    $pdo->exec(
        'CREATE INDEX IF NOT EXISTS feedback_votes_ip_idx ON feedback_votes (ip_hash, created_at)'
    );
    $pdo->exec('CREATE TABLE IF NOT EXISTS feedback_write_log (
        id         BIGSERIAL PRIMARY KEY,
        ip_hash    TEXT        NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )');
    $pdo->exec(
        'CREATE INDEX IF NOT EXISTS feedback_write_log_ip_idx ON feedback_write_log (ip_hash, created_at)'
    );
    $pdo->exec(
        'CREATE INDEX IF NOT EXISTS feedback_write_log_created_idx ON feedback_write_log (created_at)'
    );
}

/**
 * The client IP as best the server can see it. Behind the production edge
 * (Cloudflare → Heroku router) REMOTE_ADDR is a shared proxy hop, so the
 * real client only survives in the hop headers: CF-Connecting-IP is set by
 * the edge we trust, and the rightmost X-Forwarded-For entry is the client
 * the closest proxy saw. Direct / dyno-local traffic (php -S in CI) has
 * only REMOTE_ADDR.
 */
function feedback_client_ip(): string
{
    $cf = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? null;
    if (is_string($cf) && $cf !== '') {
        return $cf;
    }
    $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? null;
    if (is_string($xff) && $xff !== '') {
        $hops = array_map('trim', explode(',', $xff));
        $last = end($hops);
        if (is_string($last) && $last !== '') {
            return $last;
        }
    }
    return is_string($_SERVER['REMOTE_ADDR'] ?? null) ? $_SERVER['REMOTE_ADDR'] : '';
}

/**
 * HMAC-SHA256(client IP, FEEDBACK_SALT) truncated to 16 bytes — the raw IP
 * is never stored; the hash exists only for rate limiting and dedupe.
 */
function feedback_ip_hash(string $ip): string
{
    $salt = getenv('FEEDBACK_SALT') ?: '';
    return bin2hex(substr(hash_hmac('sha256', $ip, $salt, true), 0, 16));
}
