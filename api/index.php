<?php
/* API Hope Better World : api/?r=<route>
 * Public : ping, public (données affichables), sync (formulaires : adhésion, don, message, inscription).
 * Bureau : login, logout, data (tout), sync (toutes modifications), users, password. */

declare(strict_types=1);

require __DIR__ . '/lib.php';

$route = (string) ($_GET['r'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST' && ($_SERVER['HTTP_X_HBW'] ?? '') !== '1') {
    fail(400, 'En-tête manquant.');
}

if ($route === 'ping') {
    try {
        create_schema();
        $users = (int) pdo()->query('SELECT COUNT(*) FROM hbw_users')->fetchColumn();
    } catch (Throwable $e) {
        fail(503, 'Base de données inaccessible.');
    }
    json_out(['ok' => true, 'installe' => $users > 0]);
}

start_session();

try {
    switch ($route) {
        case 'public':
            json_out(['ok' => true, 'user' => current_user(), 'data' => public_data()]);

        case 'data':
            require_admin();
            json_out(['ok' => true, 'user' => current_user(), 'data' => full_data()]);

        case 'login':
            rate_limit('login', 10, 900);
            $in = read_json(10000);
            $st = pdo()->prepare('SELECT id, email, nom, password_hash FROM hbw_users WHERE email = ?');
            $st->execute([mb_strtolower(clean_str($in['email'] ?? '', 190))]);
            $u = $st->fetch();
            if (!$u || !password_verify((string) ($in['password'] ?? ''), $u['password_hash'])) {
                fail(401, 'E-mail ou mot de passe incorrect.');
            }
            session_regenerate_id(true);
            $_SESSION['user'] = ['id' => (int) $u['id'], 'email' => $u['email'], 'nom' => $u['nom']];
            json_out(['ok' => true, 'user' => $_SESSION['user'], 'data' => full_data()]);

        case 'logout':
            $_SESSION = [];
            session_destroy();
            json_out(['ok' => true]);

        case 'sync':
            $in = read_json(current_user() ? 30_000_000 : 60_000);
            current_user() ? admin_sync($in) : public_sync($in);
            json_out(['ok' => true]);

        case 'users':
            require_admin();
            if ($method === 'POST') {
                $in = read_json(10000);
                if (($in['action'] ?? '') === 'add') {
                    $email = mb_strtolower(clean_str($in['email'] ?? '', 190));
                    $pass = (string) ($in['password'] ?? '');
                    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($pass) < 10) {
                        fail(422, 'E-mail valide et mot de passe d’au moins 10 caractères requis.');
                    }
                    $st = pdo()->prepare('INSERT INTO hbw_users (email, nom, password_hash, created_at) VALUES (?, ?, ?, ?)');
                    try {
                        $st->execute([$email, clean_str($in['nom'] ?? '', 190), password_hash($pass, PASSWORD_DEFAULT), time()]);
                    } catch (PDOException $e) {
                        fail(409, 'Un compte existe déjà avec cet e-mail.');
                    }
                } elseif (($in['action'] ?? '') === 'delete') {
                    $id = (int) ($in['id'] ?? 0);
                    if ($id === current_user()['id']) {
                        fail(422, 'Vous ne pouvez pas supprimer votre propre compte.');
                    }
                    pdo()->prepare('DELETE FROM hbw_users WHERE id = ?')->execute([$id]);
                }
            }
            $users = pdo()->query('SELECT id, email, nom, created_at FROM hbw_users ORDER BY nom')->fetchAll();
            json_out(['ok' => true, 'users' => $users]);

        case 'password':
            $me = require_admin();
            $in = read_json(10000);
            $st = pdo()->prepare('SELECT password_hash FROM hbw_users WHERE id = ?');
            $st->execute([$me['id']]);
            if (!password_verify((string) ($in['actuel'] ?? ''), (string) $st->fetchColumn())) {
                fail(401, 'Mot de passe actuel incorrect.');
            }
            $nouveau = (string) ($in['nouveau'] ?? '');
            if (mb_strlen($nouveau) < 10) {
                fail(422, 'Le nouveau mot de passe doit faire au moins 10 caractères.');
            }
            pdo()->prepare('UPDATE hbw_users SET password_hash = ? WHERE id = ?')
                ->execute([password_hash($nouveau, PASSWORD_DEFAULT), $me['id']]);
            json_out(['ok' => true]);

        default:
            fail(404, 'Route inconnue.');
    }
} catch (PDOException $e) {
    error_log('HBW API : ' . $e->getMessage());
    fail(500, 'Erreur de base de données.');
}

/* ---------- Lecture ---------- */

function full_data(): array
{
    $out = ['version' => 1, 'settings' => get_settings()];
    foreach (COLLECTIONS as $c) {
        $out[$c] = all_records($c);
    }
    return $out;
}

/* Ce que voit un visiteur : aucune donnée personnelle hormis les noms du bureau. */
function public_data(): array
{
    $settings = get_settings();
    if ($settings) {
        unset($settings['codeGestion']);
    }
    $dons = all_records('dons');
    $projets = [];
    foreach (all_records('projets') as $p) {
        if (($p['statut'] ?? '') === 'brouillon') {
            continue;
        }
        $p['collecteDons'] = 0;
        foreach ($dons as $d) {
            if (($d['projetId'] ?? '') === $p['id'] && ($d['statut'] ?? '') === 'recu') {
                $p['collecteDons'] += (float) ($d['montant'] ?? 0);
            }
        }
        $projets[] = $p;
    }
    $evenements = array_map(function (array $e): array {
        $e['inscrits'] = array_fill(0, count($e['inscrits'] ?? []), ['nom' => '', 'email' => '', 'date' => '']);
        return $e;
    }, all_records('evenements'));
    $membres = [];
    foreach (all_records('membres') as $m) {
        if (($m['statut'] ?? '') !== 'agree') {
            continue;
        }
        $bureau = !empty($m['fonction']);
        $membres[] = [
            'id' => $m['id'], 'statut' => 'agree', 'categorie' => $m['categorie'] ?? 'actif',
            'prenom' => $bureau ? ($m['prenom'] ?? '') : '', 'nom' => $bureau ? ($m['nom'] ?? '') : '',
            'fonction' => $m['fonction'] ?? '', 'email' => '',
        ];
    }
    return [
        'version' => 1,
        'settings' => $settings,
        'membres' => $membres,
        'cotisations' => [],
        'dons' => [],
        'evenements' => $evenements,
        'flashs' => array_values(array_filter(all_records('flashs'), fn ($f) => !empty($f['publie']))),
        'medias' => all_records('medias'),
        'instances' => [],
        'messages' => [],
        'projets' => $projets,
    ];
}

/* ---------- Écriture ---------- */

function admin_sync(array $in): void
{
    $db = pdo();
    $db->beginTransaction();
    if (isset($in['settings']) && is_array($in['settings'])) {
        put_settings($in['settings']);
    }
    foreach (COLLECTIONS as $c) {
        foreach ($in['upserts'][$c] ?? [] as $rec) {
            if (is_array($rec) && valid_id($rec['id'] ?? null)) {
                unset($rec['collecteDons']);
                save_record($c, $rec);
            }
        }
        foreach ($in['deletes'][$c] ?? [] as $id) {
            if (valid_id($id)) {
                delete_record($c, $id);
            }
        }
    }
    $db->commit();
}

/* Un visiteur peut seulement : demander une adhésion, promettre un don,
 * écrire un message, s'inscrire à un événement. Tout le reste est ignoré. */
function public_sync(array $in): void
{
    $up = $in['upserts'] ?? [];
    $actions = 0;
    $today = date('Y-m-d');

    foreach (array_slice($up['membres'] ?? [], 0, 1) as $m) {
        if (!valid_id($m['id'] ?? null) || find_record('membres', $m['id'])) {
            continue;
        }
        $email = clean_str($m['email'] ?? '', 190);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            fail(422, 'Adresse e-mail invalide.');
        }
        $cat = in_array($m['categorie'] ?? '', ['actif', 'bienfaiteur', 'morale'], true) ? $m['categorie'] : 'actif';
        $rec = ['id' => $m['id'], 'statut' => 'attente', 'categorie' => $cat, 'email' => $email, 'fonction' => '',
            'dateDemande' => $today, 'dateAgrement' => '', 'motifRadiation' => '', 'exemple' => false, 'civilite' => ''];
        foreach (['prenom', 'nom', 'tel', 'adresse', 'ville', 'pays', 'raisonSociale'] as $k) {
            $rec[$k] = clean_str($m[$k] ?? '', 190);
        }
        $rec['motivation'] = clean_str($m['motivation'] ?? '', 2000);
        $actions++;
        rate_limit('public', 10, 600);
        save_record('membres', $rec);
    }

    foreach (array_slice($up['dons'] ?? [], 0, 1) as $d) {
        if (!valid_id($d['id'] ?? null) || find_record('dons', $d['id'])) {
            continue;
        }
        $montant = (float) ($d['montant'] ?? 0);
        if ($montant < 1 || $montant > 100000) {
            fail(422, 'Montant invalide.');
        }
        $projetId = valid_id($d['projetId'] ?? null) ? $d['projetId'] : '';
        $rec = ['id' => $d['id'], 'montant' => $montant, 'statut' => 'promesse', 'date' => $today, 'exemple' => false,
            'frequence' => ($d['frequence'] ?? '') === 'mensuel' ? 'mensuel' : 'unique', 'projetId' => $projetId,
            'nom' => clean_str($d['nom'] ?? 'Anonyme', 190), 'email' => clean_str($d['email'] ?? '', 190),
            'message' => clean_str($d['message'] ?? '', 1000), 'anonyme' => !empty($d['anonyme']),
            'mode' => clean_str($d['mode'] ?? '', 32)];
        $actions++;
        rate_limit('public', 10, 600);
        save_record('dons', $rec);
    }

    foreach (array_slice($up['messages'] ?? [], 0, 1) as $m) {
        if (!valid_id($m['id'] ?? null) || find_record('messages', $m['id'])) {
            continue;
        }
        $rec = ['id' => $m['id'], 'nom' => clean_str($m['nom'] ?? '', 190), 'email' => clean_str($m['email'] ?? '', 190),
            'sujet' => clean_str($m['sujet'] ?? '', 120), 'texte' => clean_str($m['texte'] ?? '', 5000),
            'date' => $today, 'lu' => false, 'exemple' => false];
        if ($rec['texte'] === '') {
            continue;
        }
        $actions++;
        rate_limit('public', 10, 600);
        save_record('messages', $rec);
    }

    foreach (array_slice($up['evenements'] ?? [], 0, 1) as $e) {
        $server = valid_id($e['id'] ?? null) ? find_record('evenements', $e['id']) : null;
        if (!$server) {
            continue;
        }
        $known = array_map(fn ($i) => mb_strtolower($i['email'] ?? ''), $server['inscrits'] ?? []);
        foreach ($e['inscrits'] ?? [] as $i) {
            $email = mb_strtolower(clean_str($i['email'] ?? '', 190));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || in_array($email, $known, true)) {
                continue;
            }
            $places = (int) ($server['places'] ?? 0);
            if ($places > 0 && count($server['inscrits'] ?? []) >= $places) {
                fail(409, 'Cet événement est complet.');
            }
            $server['inscrits'][] = ['nom' => clean_str($i['nom'] ?? '', 190), 'email' => $email, 'date' => $today];
            $actions++;
            rate_limit('public', 10, 600);
            save_record('evenements', $server);
            break;
        }
    }

    if ($actions === 0) {
        fail(403, 'Action réservée au bureau.');
    }
}
