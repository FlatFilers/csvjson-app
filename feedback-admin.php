<?php

declare(strict_types=1);

/**
 * /feedback-admin — server-rendered view of the feedback votes (spec: CSVJSON
 * feedback votes, art_2AdAvo34). Required by the index.php front controller
 * when the request path is /feedback-admin (works identically under Apache
 * and `php -S`); the direct /feedback-admin.php URL also works because real
 * files are served before the rewrite.
 *
 * Gate: HTTP Basic auth, password = ADMIN_TOKEN compared with hash_equals;
 * the username is ignored. The page is unlinked from the public UI, sends
 * X-Robots-Tag: noindex on every response, and /feedback-admin/ is
 * robots-disallowed. Everything rendered is HTML-escaped on output.
 */

require_once __DIR__ . '/feedback-db.php';

/**
 * The Basic password for this request. PHP_AUTH_PW is populated under
 * mod_php and the PHP dev server; behind PHP-FPM (how Heroku serves Apache)
 * the Authorization header survives as HTTP_AUTHORIZATION or
 * REDIRECT_HTTP_AUTHORIZATION instead — parse it ourselves there.
 */
function feedback_admin_password(): string
{
    if (isset($_SERVER['PHP_AUTH_PW']) && is_string($_SERVER['PHP_AUTH_PW'])) {
        return $_SERVER['PHP_AUTH_PW'];
    }
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (is_string($header) && stripos($header, 'Basic ') === 0) {
        $decoded = base64_decode(trim(substr($header, 6)), true);
        if (is_string($decoded) && str_contains($decoded, ':')) {
            return substr($decoded, strpos($decoded, ':') + 1);
        }
    }
    return '';
}

function feedback_admin_escape(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

// Robots must never see this page, successful auth or not.
header('X-Robots-Tag: noindex', true);

$adminToken = getenv('ADMIN_TOKEN');
if (!is_string($adminToken) || $adminToken === '') {
    http_response_code(503);
    exit('<!doctype html><title>Feedback admin</title>'
        . '<p>Feedback admin is not configured (ADMIN_TOKEN is unset).</p>');
}

if (!hash_equals($adminToken, feedback_admin_password())) {
    header('WWW-Authenticate: Basic realm="CSVJSON feedback admin"');
    http_response_code(401);
    exit('Unauthorized');
}

$pdo = feedback_db_connect();
if ($pdo === null) {
    http_response_code(503);
    exit('<!doctype html><title>Feedback admin</title>'
        . '<p>The feedback store is not configured (DATABASE_URL is unset or unreachable).</p>');
}
feedback_ensure_schema($pdo);

/**
 * Up/down totals, downvote reason breakdown, the last 100 entries, and
 * 14-day daily counts. All read through prepared statements; everything
 * that reaches the HTML below passes through feedback_admin_escape().
 */
$totals = $pdo->query(
    'SELECT COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0) AS up,
            COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) AS down
     FROM feedback_votes'
)->fetch();

$reasons = $pdo->query(
    'SELECT reason_code, COUNT(*) AS n FROM feedback_votes
     WHERE vote = -1 GROUP BY reason_code ORDER BY n DESC, reason_code'
)->fetchAll();

$recent = $pdo->query(
    'SELECT created_at, vote, reason_code, reason_text, page_path
     FROM feedback_votes ORDER BY created_at DESC, id DESC LIMIT 100'
)->fetchAll();

$dailyRows = $pdo->query(
    "SELECT (created_at AT TIME ZONE 'UTC')::date AS day,
            SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) AS up,
            SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) AS down
     FROM feedback_votes
     WHERE created_at > now() - interval '14 days'
     GROUP BY day ORDER BY day"
)->fetchAll();
$dailyByDay = [];
foreach ($dailyRows as $row) {
    $dailyByDay[$row['day']] = $row;
}
// Fill the 14-day window so the table has one row per day, oldest first.
$daily = [];
for ($offset = 13; $offset >= 0; $offset--) {
    $day = gmdate('Y-m-d', time() - $offset * 86400);
    $daily[] = [
        'day' => $day,
        'up' => (int) ($dailyByDay[$day]['up'] ?? 0),
        'down' => (int) ($dailyByDay[$day]['down'] ?? 0),
    ];
}

$up = (int) $totals['up'];
$down = (int) $totals['down'];
$total = $up + $down;
$positivePct = $total > 0 ? (int) round($up / $total * 100) : null;

$reasonLabels = [
    'wrong_output' => 'The conversion is wrong',
    'hard_to_use' => 'Hard to use',
    'missing_feature' => 'Missing a feature',
    'slower' => 'Slower than the old site',
    'looks_worse' => 'Looks worse',
    'other' => 'Other',
];
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>CSVJSON feedback admin</title>
<style>
    body { font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; margin: 2rem auto; max-width: 60rem; padding: 0 1rem; color: #1a1a1a; background: #fff; }
    h1 { font-size: 1.1rem; } h2 { font-size: 0.95rem; margin-top: 2rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 0.5rem; }
    th, td { border: 1px solid #ddd; padding: 0.3rem 0.55rem; text-align: left; }
    th { background: #f6f6f6; font-weight: 600; }
    .chip { display: inline-block; border: 1px solid #ccc; border-radius: 3px; padding: 0 0.35rem; font-size: 0.85em; }
    .pos { color: #166534; } .neg { color: #991b1b; }
    .empty { color: #777; font-style: italic; }
    @media (prefers-color-scheme: dark) {
        body { color: #e5e5e5; background: #171717; }
        th { background: #262626; } th, td { border-color: #333; }
        .chip { border-color: #555; }
    }
</style>
</head>
<body>
<h1>CSVJSON feedback</h1>

<h2>Totals</h2>
<p>
    <span class="pos">&#9650; <?= $up ?> up</span> ·
    <span class="neg">&#9660; <?= $down ?> down</span>
    — <?= $positivePct === null ? 'no votes yet' : $positivePct . '% positive' ?>
</p>

<h2>Why the downvotes</h2>
<?php if ($reasons === []) : ?>
    <p class="empty">No downvotes yet.</p>
<?php else : ?>
<table>
    <tr><th>Reason</th><th>Count</th></tr>
    <?php foreach ($reasons as $reason) : ?>
    <tr>
        <td><span class="chip"><?= feedback_admin_escape($reasonLabels[(string) ($reason['reason_code'] ?? 'other')] ?? (string) ($reason['reason_code'] ?? 'other')) ?></span></td>
        <td><?= (int) $reason['n'] ?></td>
    </tr>
    <?php endforeach; ?>
</table>
<?php endif; ?>

<h2>Last 14 days</h2>
<table>
    <tr><th>Day (UTC)</th><th>Up</th><th>Down</th></tr>
    <?php foreach ($daily as $row) : ?>
    <tr>
        <td><?= feedback_admin_escape($row['day']) ?></td>
        <td><?= $row['up'] ?></td>
        <td><?= $row['down'] ?></td>
    </tr>
    <?php endforeach; ?>
</table>

<h2>Last 100 entries</h2>
<?php if ($recent === []) : ?>
    <p class="empty">No votes recorded yet.</p>
<?php else : ?>
<table>
    <tr><th>Recorded (UTC)</th><th>Vote</th><th>Reason</th><th>Free text</th><th>Path</th></tr>
    <?php foreach ($recent as $entry) : ?>
    <tr>
        <td><?= feedback_admin_escape(substr((string) $entry['created_at'], 0, 16)) ?></td>
        <td><?= ((int) $entry['vote']) === 1 ? '<span class="pos">up</span>' : '<span class="neg">down</span>' ?></td>
        <td><?= $entry['reason_code'] !== null
            ? '<span class="chip">' . feedback_admin_escape($entry['reason_code']) . '</span>' : '' ?></td>
        <td><?= feedback_admin_escape($entry['reason_text']) ?></td>
        <td><?= feedback_admin_escape($entry['page_path']) ?></td>
    </tr>
    <?php endforeach; ?>
</table>
<?php endif; ?>
</body>
</html>
