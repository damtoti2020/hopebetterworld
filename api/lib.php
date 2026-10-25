<?php
/* Fonctions communes de l'API Hope Better World (PHP 8, MySQL ou SQLite). */

declare(strict_types=1);

const COLLECTIONS = ['membres', 'cotisations', 'dons', 'evenements', 'flashs', 'medias', 'instances', 'messages', 'projets'];

function config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $file = __DIR__ . '/config.php';
        if (!is_file($file)) {
            fail(503, 'Configuration manquante : créez api/config.php à partir de config.sample.php.');
        }
        $cfg = require $file;
    }
    return $cfg;
}

function pdo(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $cfg = config();
        $pdo = new PDO($cfg['dsn'], $cfg['user'] ?? null, $cfg['password'] ?? null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function is_mysql(): bool
{
    return pdo()->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
}

function create_schema(): void
{
    $mysql = is_mysql();
    $text = $mysql ? 'LONGTEXT' : 'TEXT';
    $engine = $mysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
    $autoId = $mysql ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $db = pdo();
    $db->exec("CREATE TABLE IF NOT EXISTS hbw_records (
        collection VARCHAR(32) NOT NULL,
        id VARCHAR(64) NOT NULL,
        data $text NOT NULL,
        updated_at INT NOT NULL,
        PRIMARY KEY (collection, id))$engine");
    $db->exec("CREATE TABLE IF NOT EXISTS hbw_settings (
        k VARCHAR(64) NOT NULL PRIMARY KEY,
        v $text NOT NULL)$engine");
    $db->exec("CREATE TABLE IF NOT EXISTS hbw_users (
        id $autoId,
        email VARCHAR(190) NOT NULL UNIQUE,
        nom VARCHAR(190) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at INT NOT NULL)$engine");
    $db->exec("CREATE TABLE IF NOT EXISTS hbw_rate (
        ip VARCHAR(64) NOT NULL,
        kind VARCHAR(16) NOT NULL,
        t INT NOT NULL)$engine");
}

function fail(int $status, string $message): never
{
    json_out(['ok' => false, 'error' => $message], $status);
}

function json_out(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json(int $maxBytes): array
{
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($raw === false || strlen($raw) > $maxBytes) {
        fail(413, 'Données trop volumineuses.');
    }
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) {
        fail(400, 'Requête invalide.');
    }
    return $data;
}

function start_session(): void
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('hbw_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

function require_admin(): array
{
    $u = current_user();
    if (!$u) {
        fail(401, 'Connexion requise.');
    }
    return $u;
}

function client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? 'inconnue'), 0, 64);
}

/* Limite le nombre d'actions d'une même adresse IP sur une période donnée. */
function rate_limit(string $kind, int $max, int $seconds): void
{
    $db = pdo();
    $now = time();
    $db->prepare('DELETE FROM hbw_rate WHERE t < ?')->execute([$now - 86400]);
    $st = $db->prepare('SELECT COUNT(*) FROM hbw_rate WHERE ip = ? AND kind = ? AND t > ?');
    $st->execute([client_ip(), $kind, $now - $seconds]);
    if ((int) $st->fetchColumn() >= $max) {
        fail(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
    }
    $db->prepare('INSERT INTO hbw_rate (ip, kind, t) VALUES (?, ?, ?)')->execute([client_ip(), $kind, $now]);
}

function all_records(string $collection): array
{
    $st = pdo()->prepare('SELECT data FROM hbw_records WHERE collection = ?');
    $st->execute([$collection]);
    $out = [];
    foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $json) {
        $rec = json_decode($json, true);
        if (is_array($rec)) {
            $out[] = $rec;
        }
    }
    return $out;
}

function find_record(string $collection, string $id): ?array
{
    $st = pdo()->prepare('SELECT data FROM hbw_records WHERE collection = ? AND id = ?');
    $st->execute([$collection, $id]);
    $json = $st->fetchColumn();
    return $json === false ? null : json_decode($json, true);
}

function save_record(string $collection, array $rec): void
{
    $db = pdo();
    $db->prepare('DELETE FROM hbw_records WHERE collection = ? AND id = ?')->execute([$collection, $rec['id']]);
    $db->prepare('INSERT INTO hbw_records (collection, id, data, updated_at) VALUES (?, ?, ?, ?)')
        ->execute([$collection, $rec['id'], json_encode($rec, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), time()]);
}

function delete_record(string $collection, string $id): void
{
    pdo()->prepare('DELETE FROM hbw_records WHERE collection = ? AND id = ?')->execute([$collection, $id]);
}

function get_settings(): ?array
{
    $st = pdo()->prepare('SELECT v FROM hbw_settings WHERE k = ?');
    $st->execute(['settings']);
    $json = $st->fetchColumn();
    return $json === false ? null : json_decode($json, true);
}

function put_settings(array $settings): void
{
    $db = pdo();
    $db->prepare('DELETE FROM hbw_settings WHERE k = ?')->execute(['settings']);
    $db->prepare('INSERT INTO hbw_settings (k, v) VALUES (?, ?)')
        ->execute(['settings', json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
}

function valid_id(mixed $id): bool
{
    return is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id) === 1;
}

function clean_str(mixed $v, int $max = 2000): string
{
    return mb_substr(trim(is_scalar($v) ? (string) $v : ''), 0, $max);
}
