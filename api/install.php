<?php
/* Installation : crée les tables et le premier compte du bureau.
 * Ne fonctionne qu'une fois : dès qu'un compte existe, la page se bloque. */

declare(strict_types=1);

require __DIR__ . '/lib.php';

$message = '';
$done = false;

try {
    create_schema();
    $installed = (int) pdo()->query('SELECT COUNT(*) FROM hbw_users')->fetchColumn() > 0;
} catch (Throwable $e) {
    $installed = false;
    $message = 'Connexion à la base impossible : vérifiez api/config.php.';
}

if (!$installed && !$message && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $nom = clean_str($_POST['nom'] ?? '', 190);
    $email = mb_strtolower(clean_str($_POST['email'] ?? '', 190));
    $pass = (string) ($_POST['password'] ?? '');
    if ($nom === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($pass) < 10) {
        $message = 'Indiquez un nom, un e-mail valide et un mot de passe d’au moins 10 caractères.';
    } else {
        pdo()->prepare('INSERT INTO hbw_users (email, nom, password_hash, created_at) VALUES (?, ?, ?, ?)')
            ->execute([$email, $nom, password_hash($pass, PASSWORD_DEFAULT), time()]);
        $done = true;
    }
}

$h = fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
?><!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Installation · Hope Better World</title>
<style>
  body { font: 17px/1.5 system-ui, sans-serif; background: #f1f2f8; color: #171a2c; margin: 0; padding: 40px 16px; }
  main { max-width: 460px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 8px 24px rgb(0 0 0 / 0.06); }
  h1 { font-size: 1.5rem; margin: 0 0 8px; }
  label { display: block; font-weight: 600; margin: 16px 0 6px; }
  input { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #dfe1ec; border-radius: 10px; font: inherit; }
  button, a.btn { display: inline-block; margin-top: 20px; background: #d7261e; color: #fff; border: 0; border-radius: 999px; padding: 12px 22px; font: 700 1rem system-ui; cursor: pointer; text-decoration: none; }
  .msg { background: #fde4e3; color: #a3171a; padding: 12px; border-radius: 10px; margin-top: 16px; }
  .ok { background: #e3f4e6; color: #1f7a35; }
</style>
</head>
<body>
<main>
  <h1>Installation du site</h1>
  <?php if ($done): ?>
    <p class="msg ok">Installation terminée. Le compte de <?= $h($nom) ?> est créé.</p>
    <p>Ouvrez l’espace gestion et connectez-vous : le site sera initialisé avec les informations de l’association.</p>
    <a class="btn" href="../#gestion">Ouvrir l’espace gestion</a>
  <?php elseif ($installed): ?>
    <p>Le site est déjà installé. Pour ajouter un membre du bureau, passez par Espace gestion → Paramètres → Comptes du bureau.</p>
    <a class="btn" href="../#gestion">Ouvrir l’espace gestion</a>
  <?php else: ?>
    <p>Créez le premier compte du bureau (le président, par exemple). Les autres comptes s’ajouteront ensuite depuis l’espace gestion.</p>
    <?php if ($message): ?><p class="msg"><?= $h($message) ?></p><?php endif; ?>
    <form method="post">
      <label for="nom">Nom et prénom</label><input id="nom" name="nom" required autocomplete="name">
      <label for="email">E-mail</label><input id="email" name="email" type="email" required autocomplete="email">
      <label for="password">Mot de passe (10 caractères minimum)</label><input id="password" name="password" type="password" minlength="10" required autocomplete="new-password">
      <button type="submit">Créer le compte</button>
    </form>
  <?php endif; ?>
</main>
</body>
</html>
