<?php

declare(strict_types=1);

/**
 * Storage plumbing for the changelog vote feature (spec: CSVJSON changelog
 * widget, art_YzASNds2). Mirrors feedback-db.php's role: functions only, no
 * side effects, so both changelog-vote-api.php (POST /api/changelog-vote)
 * and feedback-admin.php (the "Changelog votes" readout) can require it.
 * The connection, the salted truncated IP hash, and the shared write log
 * rate-limit table all come from feedback-db.php — one write-log backs both
 * sanctioned write paths, so the caps count their writes together.
 */

const CHANGELOG_MAX_ENTRY_ID = 1000000;

/**
 * One changeable vote per browser per entry (spec): the (client_id, entry_id)
 * unique pair backs the upsert. Votes are never deleted; a changed vote
 * updates the row in place.
 */
function changelog_ensure_schema(PDO $pdo): void
{
    $pdo->exec('CREATE TABLE IF NOT EXISTS changelog_votes (
        id         BIGSERIAL PRIMARY KEY,
        client_id  UUID        NOT NULL,
        entry_id   INTEGER     NOT NULL CHECK (entry_id >= 1 AND entry_id <= ' . CHANGELOG_MAX_ENTRY_ID . '),
        vote       SMALLINT    NOT NULL CHECK (vote IN (1, -1)),
        ip_hash    TEXT        NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (client_id, entry_id)
    )');
    $pdo->exec(
        'CREATE INDEX IF NOT EXISTS changelog_votes_entry_idx ON changelog_votes (entry_id)'
    );
}
