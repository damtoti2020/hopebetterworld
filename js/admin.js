import { db, regles, todayISO, addDays, CATEGORIES, STATUTS_MEMBRE, TYPES_EVENEMENT, INSTANCES } from './data.js';
import {
  esc, fmtDate, fmtEUR, icons, toast, openModal, modalHead, confirmBox, formData, download, copy, toCSV, readFileAsDataURL, parseISO,
} from './ui.js';

const SESSION_KEY = 'hbw-gestion';
let unlocked = false;
try { unlocked = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { /* navigation privée */ }
let tab = 'tableau';

const TABS = {
  tableau: { label: 'Tableau de bord', icon: 'layout-dashboard', render: tTableau },
  membres: { label: 'Membres', icon: 'users', render: tMembres, count: () => db.data.membres.filter((m) => m.statut === 'attente').length },
  cotisations: { label: 'Cotisations', icon: 'wallet', render: tCotisations },
  dons: { label: 'Dons', icon: 'heart', render: tDons, count: () => db.data.dons.filter((d) => d.statut === 'promesse').length },
  agenda: { label: 'Événements', icon: 'calendar-days', render: tAgenda },
  medias: { label: 'Flash et galerie', icon: 'clapperboard', render: tMedias },
  instances: { label: 'AG et conseils', icon: 'gavel', render: tInstances },
  messages: { label: 'Messages', icon: 'inbox', render: tMessages, count: () => db.data.messages.filter((m) => !m.lu).length },
  parametres: { label: 'Paramètres', icon: 'sliders-horizontal', render: tParametres },
};

const year = () => new Date().getFullYear();
const nomComplet = (m) => (m.categorie === 'morale' && m.raisonSociale ? m.raisonSociale : `${m.prenom} ${m.nom}`);
const exChip = (x) => (x.exemple ? ' <span class="chip ex">exemple</span>' : '');
const opt = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(typeof v === 'string' ? v : v.label)}</option>`).join('');

export function renderAdmin(root) {
  if (!unlocked) return renderLogin(root);
  root.innerHTML = `<div class="wrap admin">
    <nav class="admin-nav" aria-label="Sections de gestion" id="admin-nav"></nav>
    <div class="admin-main" id="admin-main"></div>
  </div>`;
  draw(root);
  root.querySelector('#admin-nav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) { tab = b.dataset.tab; draw(root); root.querySelector('#admin-main').scrollIntoView({ block: 'start' }); }
  });
}

function draw(root) {
  root.querySelector('#admin-nav').innerHTML = Object.entries(TABS).map(([k, t]) => {
    const n = t.count?.() || 0;
    return `<button type="button" data-tab="${k}" ${k === tab ? 'aria-current="true"' : ''}><i data-lucide="${t.icon}"></i>${esc(t.label)}${n ? `<span class="count">${n}</span>` : ''}</button>`;
  }).join('') + '<button type="button" id="logout"><i data-lucide="log-out"></i>Se déconnecter</button>';
  root.querySelector('#logout').onclick = () => {
    unlocked = false;
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* rien */ }
    renderAdmin(root);
  };
  const old = root.querySelector('#admin-main');
  const main = old.cloneNode(false);
  old.replaceWith(main);
  const rerender = () => draw(root);
  TABS[tab].render(main, rerender);
  icons();
}

function renderLogin(root) {
  root.innerHTML = `<section class="section"><div class="wrap" style="max-width:520px">
    <form class="panel form" id="login">
      <span class="eyebrow">Réservé au bureau</span>
      <h2>Espace gestion</h2>
      <p class="muted">Membres, cotisations, dons, agenda, vidéos, assemblées générales et conseils d’administration.</p>
      <div class="field"><label for="code">Code d’accès</label><input id="code" name="code" type="password" autocomplete="current-password" required></div>
      <p class="small muted" id="login-err" role="alert"></p>
      <button class="btn btn-blue" type="submit"><i data-lucide="lock-open"></i>Entrer</button>
      <div class="notice"><i data-lucide="info"></i><span>Version de démonstration : le code est <b>hbw2026</b>. Il se change dans Paramètres. En production, chaque membre du bureau aura son propre compte.</span></div>
    </form>
  </div></section>`;
  icons();
  root.querySelector('#login').addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.code.value === db.data.settings.codeGestion) {
      unlocked = true;
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (err) { /* rien */ }
      renderAdmin(root);
    } else root.querySelector('#login-err').textContent = 'Code incorrect. Vérifiez les majuscules et réessayez.';
  });
}

/* ---------- Tableau de bord ---------- */
function tTableau(main) {
  const d = db.data;
  const y = year();
  const agrees = d.membres.filter((m) => m.statut === 'agree');
  const dus = agrees.filter(regles.cotisationDue);
  const aJour = dus.filter((m) => regles.estAJour(m, y));
  const cotisY = d.cotisations.filter((c) => c.annee === y).reduce((s, c) => s + Number(c.montant), 0);
  const donsY = d.dons.filter((x) => x.statut === 'recu' && x.date.startsWith(String(y)));
  const donsTotal = donsY.reduce((s, x) => s + Number(x.montant), 0);
  const attente = d.membres.filter((m) => m.statut === 'attente');
  const t = todayISO();
  const prochaine = d.instances.filter((i) => i.date >= t && i.statut !== 'tenue').sort((a, b) => a.date.localeCompare(b.date))[0];
  const events = d.evenements.filter((e) => e.date >= t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => donsY.filter((x) => parseISO(x.date).getMonth() === i).reduce((s, x) => s + Number(x.montant), 0));
  const max = Math.max(1, ...months);
  const curM = new Date().getMonth();
  const alertes = [];
  if (attente.length) alertes.push(['warn', 'user-check', `${attente.length} demande${attente.length > 1 ? 's' : ''} d’adhésion à agréer par le conseil d’administration`, 'membres']);
  if (prochaine && !prochaine.dateConvocation) {
    const lim = regles.dateLimiteConvocation(prochaine);
    const late = lim < t;
    alertes.push([late ? 'bad' : 'warn', 'mail-warning', `${INSTANCES[prochaine.type].label} du ${fmtDate(prochaine.date)} : convocations à envoyer ${late ? 'en retard (date limite dépassée le ' : 'avant le '}${fmtDate(lim)}${late ? ')' : ''}`, 'instances']);
  }
  const promesses = d.dons.filter((x) => x.statut === 'promesse').length;
  if (promesses) alertes.push(['warn', 'hand-coins', `${promesses} promesse${promesses > 1 ? 's' : ''} de don à confirmer`, 'dons']);
  const nonLus = d.messages.filter((m) => !m.lu).length;
  if (nonLus) alertes.push(['', 'inbox', `${nonLus} message${nonLus > 1 ? 's' : ''} non lu${nonLus > 1 ? 's' : ''}`, 'messages']);

  main.innerHTML = `
    <div class="spread"><h2>Tableau de bord</h2><span class="muted">Exercice ${y}</span></div>
    <div class="kpis">
      <div class="kpi"><span class="l">Membres agréés</span><span class="v">${agrees.length}</span><span class="small muted">${attente.length} en attente</span></div>
      <div class="kpi"><span class="l">À jour de cotisation</span><span class="v">${aJour.length}/${dus.length}</span><span class="small muted">${dus.length ? Math.round((aJour.length / dus.length) * 100) : 0} % des membres cotisants</span></div>
      <div class="kpi"><span class="l">Cotisations ${y}</span><span class="v">${fmtEUR(cotisY)}</span></div>
      <div class="kpi"><span class="l">Dons reçus ${y}</span><span class="v">${fmtEUR(donsTotal)}</span><span class="small muted">${donsY.length} don${donsY.length > 1 ? 's' : ''}</span></div>
    </div>
    ${alertes.length ? `<div class="panel stack"><h3>À faire</h3>${alertes.map(([k, ic, txt, go]) => `<div class="notice ${k}"><i data-lucide="${ic}"></i><span style="flex:1">${esc(txt)}</span><button class="btn btn-ghost btn-sm" type="button" data-go="${go}">Ouvrir</button></div>`).join('')}</div>` : '<div class="notice ok"><i data-lucide="check-circle-2"></i>Rien d’urgent. Tout est à jour.</div>'}
    <div class="split">
      <div class="panel stack"><h3>Dons reçus par mois (${y})</h3>
        <div class="bars" role="img" aria-label="Dons reçus par mois">${months.map((v, i) => `<div class="b ${i === curM ? 'cur' : ''}" title="${fmtEUR(v)}"><span class="num">${v ? Math.round(v) : ''}</span><i style="height:${(v / max) * 100}%"></i><span>${'JFMAMJJASOND'[i]}</span></div>`).join('')}</div>
      </div>
      <div class="panel stack"><h3>Prochains événements</h3>
        ${events.length ? events.map((e) => `<div class="spread"><span><b>${esc(e.titre)}</b><br><span class="small muted">${esc(fmtDate(e.date))} · ${e.inscrits.length} inscrit${e.inscrits.length > 1 ? 's' : ''}</span></span></div>`).join('') : '<p class="muted">Aucun événement programmé.</p>'}
      </div>
    </div>`;
  main.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => document.querySelector(`[data-tab="${b.dataset.go}"]`).click()));
}

/* ---------- Membres ---------- */
let mFilter = { q: '', cat: '', statut: '' };
function tMembres(main, rerender) {
  const y = year();
  const list = db.data.membres.filter((m) => {
    const q = mFilter.q.toLowerCase();
    return (!q || `${m.prenom} ${m.nom} ${m.email} ${m.raisonSociale} ${m.ville}`.toLowerCase().includes(q))
      && (!mFilter.cat || m.categorie === mFilter.cat) && (!mFilter.statut || m.statut === mFilter.statut);
  }).sort((a, b) => (a.statut === 'attente' ? -1 : 0) - (b.statut === 'attente' ? -1 : 0) || a.nom.localeCompare(b.nom));
  main.innerHTML = `
    <div class="spread"><h2>Membres</h2><div class="row"><button class="btn btn-ghost btn-sm" type="button" id="m-export"><i data-lucide="file-down"></i>Exporter (CSV)</button><button class="btn btn-primary btn-sm" type="button" id="m-add"><i data-lucide="plus"></i>Ajouter</button></div></div>
    <div class="toolbar">
      <input type="search" id="m-q" placeholder="Rechercher un nom, un e-mail, une ville" value="${esc(mFilter.q)}" aria-label="Rechercher">
      <select id="m-cat" aria-label="Catégorie"><option value="">Toutes catégories</option>${opt(CATEGORIES, mFilter.cat)}</select>
      <select id="m-statut" aria-label="Statut"><option value="">Tous statuts</option>${opt(STATUTS_MEMBRE, mFilter.statut)}</select>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Membre</th><th>Catégorie</th><th>Statut</th><th>Cotisation ${y}</th><th class="actions"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${list.length ? list.map((m) => {
        const due = regles.cotisationDue(m);
        const ajour = regles.estAJour(m, y);
        return `<tr>
          <td><b>${esc(nomComplet(m))}</b>${m.fonction ? ` <span class="chip blue">${esc(m.fonction)}</span>` : ''}${exChip(m)}<div class="sub">${esc(m.email || '—')}${m.ville ? ' · ' + esc(m.ville) : ''}</div></td>
          <td>${esc(CATEGORIES[m.categorie]?.court || m.categorie)}</td>
          <td><span class="chip ${m.statut === 'agree' ? 'ok' : m.statut === 'attente' ? 'warn' : 'bad'}">${esc(STATUTS_MEMBRE[m.statut])}</span>${m.statut === 'attente' ? `<div class="sub">depuis le ${esc(fmtDate(m.dateDemande))}</div>` : ''}</td>
          <td>${m.statut !== 'agree' ? '<span class="muted">—</span>' : !due ? '<span class="chip">Dispensé</span>' : ajour ? '<span class="chip ok">À jour</span>' : '<span class="chip bad">Non payée</span>'}</td>
          <td class="actions">
            ${m.statut === 'attente' ? `<button class="btn btn-blue btn-sm" type="button" data-agree="${m.id}">Agréer</button>` : ''}
            <button class="icon-btn" type="button" data-edit="${m.id}" aria-label="Modifier ${esc(nomComplet(m))}"><i data-lucide="pencil"></i></button>
          </td></tr>`;
      }).join('') : '<tr><td colspan="5" class="empty">Aucun membre ne correspond à ces filtres.</td></tr>'}</tbody>
    </table></div>
    <p class="small muted">Agrément par le conseil d’administration (art. 5). Radiation pour non-paiement ou motif grave, après explications devant le bureau (art. 6).</p>`;
  const q = main.querySelector('#m-q');
  q.addEventListener('input', () => { mFilter.q = q.value; const pos = q.selectionStart; rerender(); const nq = document.getElementById('m-q'); nq.focus(); nq.setSelectionRange(pos, pos); });
  main.querySelector('#m-cat').addEventListener('change', (e) => { mFilter.cat = e.target.value; rerender(); });
  main.querySelector('#m-statut').addEventListener('change', (e) => { mFilter.statut = e.target.value; rerender(); });
  main.querySelector('#m-add').addEventListener('click', () => memberForm(null, rerender));
  main.querySelector('#m-export').addEventListener('click', () => download(`membres-hbw-${todayISO()}.csv`, toCSV(db.data.membres.map((m) => ({
    Nom: m.nom, Prénom: m.prenom, 'Raison sociale': m.raisonSociale, Catégorie: CATEGORIES[m.categorie]?.label, Statut: STATUTS_MEMBRE[m.statut], Fonction: m.fonction,
    'E-mail': m.email, Téléphone: m.tel, Adresse: m.adresse, Ville: m.ville, Pays: m.pays, 'Date de demande': m.dateDemande, "Date d'agrément": m.dateAgrement,
    [`Cotisation ${y}`]: regles.cotisationDue(m) ? (regles.estAJour(m, y) ? 'payée' : 'non payée') : 'dispensé',
  }))), 'text/csv'));
  main.addEventListener('click', (e) => {
    const a = e.target.closest('[data-agree]');
    if (a) { db.update('membres', a.dataset.agree, { statut: 'agree', dateAgrement: todayISO() }); toast('Adhésion agréée'); rerender(); }
    const ed = e.target.closest('[data-edit]');
    if (ed) memberForm(db.find('membres', ed.dataset.edit), rerender);
  });
}

function memberForm(m, rerender) {
  const isNew = !m;
  m = m || { prenom: '', nom: '', email: '', tel: '', adresse: '', ville: '', pays: 'France', categorie: 'actif', raisonSociale: '', statut: 'agree', fonction: '', motifRadiation: '', dateDemande: todayISO(), dateAgrement: todayISO() };
  const cotis = isNew ? [] : db.data.cotisations.filter((c) => c.membreId === m.id).sort((a, b) => b.annee - a.annee);
  const modal = openModal(`${modalHead(isNew ? 'Nouveau membre' : nomComplet(m), isNew ? '' : `Demande le ${fmtDate(m.dateDemande)}${m.dateAgrement ? ` · agréé le ${fmtDate(m.dateAgrement)}` : ''}`)}
    <form class="form" id="mf">
      <div class="form-grid">
        <div class="field"><label for="mf-prenom">Prénom</label><input id="mf-prenom" name="prenom" value="${esc(m.prenom)}" required></div>
        <div class="field"><label for="mf-nom">Nom</label><input id="mf-nom" name="nom" value="${esc(m.nom)}" required></div>
        <div class="field"><label for="mf-cat">Catégorie</label><select id="mf-cat" name="categorie">${opt(CATEGORIES, m.categorie)}</select></div>
        <div class="field"><label for="mf-rs">Raison sociale (pers. morale)</label><input id="mf-rs" name="raisonSociale" value="${esc(m.raisonSociale)}"></div>
        <div class="field"><label for="mf-fonction">Fonction au bureau / CA</label><select id="mf-fonction" name="fonction">${['', 'Président', 'Vice-président', 'Secrétaire', 'Trésorier', 'Administrateur'].map((f) => `<option ${f === m.fonction ? 'selected' : ''} value="${f}">${f || 'Aucune'}</option>`).join('')}</select></div>
        <div class="field"><label for="mf-statut">Statut</label><select id="mf-statut" name="statut">${opt(STATUTS_MEMBRE, m.statut)}</select></div>
        <div class="field"><label for="mf-email">E-mail</label><input id="mf-email" name="email" type="email" value="${esc(m.email)}"></div>
        <div class="field"><label for="mf-tel">Téléphone</label><input id="mf-tel" name="tel" value="${esc(m.tel)}"></div>
        <div class="field"><label for="mf-adresse">Adresse</label><input id="mf-adresse" name="adresse" value="${esc(m.adresse)}"></div>
        <div class="field"><label for="mf-ville">Ville</label><input id="mf-ville" name="ville" value="${esc(m.ville)}"></div>
        <div class="field"><label for="mf-pays">Pays</label><input id="mf-pays" name="pays" value="${esc(m.pays)}"></div>
      </div>
      <div class="field" id="mf-motif-f" ${m.statut === 'radie' ? '' : 'hidden'}><label for="mf-motif">Motif de radiation (art. 6)</label><select id="mf-motif" name="motifRadiation">${['', 'Démission', 'Décès', 'Dissolution (personne morale)', 'Non-paiement de la cotisation', 'Motif grave'].map((x) => `<option ${x === m.motifRadiation ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      ${m.motivation ? `<div class="notice"><i data-lucide="message-square"></i><span>${esc(m.motivation)}</span></div>` : ''}
      ${isNew ? '' : `<div class="stack" style="gap:6px"><b>Historique des cotisations</b>${cotis.length ? cotis.map((c) => `<span class="small">${c.annee} : ${fmtEUR(c.montant)} le ${fmtDate(c.date)} (${esc(c.mode)})</span>`).join('') : '<span class="small muted">Aucune cotisation enregistrée.</span>'}</div>`}
      <div class="spread">
        ${isNew ? '<span></span>' : '<button class="btn btn-danger btn-sm" type="button" id="mf-del"><i data-lucide="trash-2"></i>Supprimer la fiche</button>'}
        <div class="row"><button class="btn btn-ghost" type="button" data-dismiss>Annuler</button><button class="btn btn-primary" type="submit">Enregistrer</button></div>
      </div>
    </form>`, { wide: true });
  const f = modal.el.querySelector('#mf');
  f.statut.addEventListener('change', () => { modal.el.querySelector('#mf-motif-f').hidden = f.statut.value !== 'radie'; });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = formData(f);
    if (d.statut === 'agree' && !m.dateAgrement) d.dateAgrement = todayISO();
    if (d.statut !== 'radie') d.motifRadiation = '';
    if (isNew) db.insert('membres', { ...m, ...d, exemple: false }); else db.update('membres', m.id, d);
    modal.close(); toast(isNew ? 'Membre ajouté' : 'Fiche mise à jour'); rerender();
  });
  modal.el.querySelector('#mf-del')?.addEventListener('click', async () => {
    modal.close();
    if (await confirmBox(`Supprimer définitivement la fiche de ${nomComplet(m)} et ses cotisations ? Pour un départ, préférez le statut « Radié » qui garde l’historique.`, { ok: 'Supprimer' })) {
      db.remove('membres', m.id);
      db.data.cotisations = db.data.cotisations.filter((c) => c.membreId !== m.id); db.save();
      toast('Fiche supprimée'); rerender();
    }
  });
}

/* ---------- Cotisations ---------- */
let cYear = null;
function tCotisations(main, rerender) {
  const y = cYear || year();
  const membres = db.data.membres.filter((m) => m.statut === 'agree' && regles.cotisationDue(m)).sort((a, b) => a.nom.localeCompare(b.nom));
  const paid = (m) => db.data.cotisations.find((c) => c.membreId === m.id && c.annee === y);
  const unpaid = membres.filter((m) => !paid(m));
  const total = db.data.cotisations.filter((c) => c.annee === y).reduce((s, c) => s + Number(c.montant), 0);
  const years = [...new Set([year() + 1, year(), year() - 1, year() - 2, ...db.data.cotisations.map((c) => c.annee)])].sort((a, b) => b - a);
  main.innerHTML = `
    <div class="spread"><h2>Cotisations</h2><select id="c-year" aria-label="Année" style="width:auto">${years.map((x) => `<option ${x === y ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="kpis">
      <div class="kpi"><span class="l">Encaissé ${y}</span><span class="v">${fmtEUR(total)}</span></div>
      <div class="kpi"><span class="l">À jour</span><span class="v">${membres.length - unpaid.length}/${membres.length}</span></div>
      <div class="kpi"><span class="l">À relancer</span><span class="v">${unpaid.length}</span></div>
    </div>
    ${unpaid.length ? `<div class="panel stack" data-copy-scope><div class="spread"><h3>Appel à cotisation</h3><button class="btn btn-ghost btn-sm" type="button" id="c-copy"><i data-lucide="copy"></i>Copier les e-mails</button></div>
      <p class="small muted">Adresses des membres qui n’ont pas réglé ${y}. Collez-les dans votre messagerie (champ Cci).</p>
      <div class="copybox" data-copy-target>${esc(unpaid.map((m) => m.email).filter(Boolean).join(', ') || 'Aucune adresse e-mail renseignée.')}</div></div>` : ''}
    <div class="table-wrap"><table>
      <thead><tr><th>Membre</th><th>Catégorie</th><th>Montant attendu</th><th>Paiement ${y}</th><th class="actions"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${membres.map((m) => { const p = paid(m); return `<tr>
        <td><b>${esc(nomComplet(m))}</b>${exChip(m)}</td><td>${esc(CATEGORIES[m.categorie].court)}</td><td class="num">${fmtEUR(regles.montantCotisation(m.categorie))}</td>
        <td>${p ? `<span class="chip ok">${fmtEUR(p.montant)} · ${esc(fmtDate(p.date))}</span><div class="sub">${esc(p.mode)}</div>` : '<span class="chip bad">Non payée</span>'}</td>
        <td class="actions">${p ? `<button class="btn btn-ghost btn-sm" type="button" data-cancel="${p.id}">Annuler</button>` : `<button class="btn btn-blue btn-sm" type="button" data-pay="${m.id}">Encaisser</button>`}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">Aucun membre cotisant agréé.</td></tr>'}</tbody>
    </table></div>
    <p class="small muted">Les membres d’honneur sont dispensés (art. 5). Seuls les membres à jour à la date de convocation participent à l’AG (art. 8).</p>`;
  main.querySelector('#c-year').addEventListener('change', (e) => { cYear = Number(e.target.value); rerender(); });
  main.querySelector('#c-copy')?.addEventListener('click', (e) => copy(unpaid.map((m) => m.email).filter(Boolean).join(', '), e.currentTarget));
  main.addEventListener('click', async (e) => {
    const p = e.target.closest('[data-pay]');
    if (p) {
      const m = db.find('membres', p.dataset.pay);
      const modal = openModal(`${modalHead('Encaisser une cotisation', `${nomComplet(m)} · ${y}`)}
        <form class="form" id="pf"><div class="form-grid">
          <div class="field"><label for="pf-montant">Montant (€)</label><input id="pf-montant" name="montant" type="number" min="0" step="1" value="${regles.montantCotisation(m.categorie)}" required></div>
          <div class="field"><label for="pf-date">Date</label><input id="pf-date" name="date" type="date" value="${todayISO()}" required></div>
          <div class="field"><label for="pf-mode">Mode</label><select id="pf-mode" name="mode"><option value="helloasso">HelloAsso</option><option value="virement">Virement</option><option value="cheque">Chèque</option><option value="especes">Espèces</option></select></div>
        </div><div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" type="button" data-dismiss>Annuler</button><button class="btn btn-primary" type="submit">Enregistrer</button></div></form>`);
      modal.el.querySelector('#pf').addEventListener('submit', (ev) => {
        ev.preventDefault();
        db.insert('cotisations', { membreId: m.id, annee: y, ...formData(ev.target), exemple: false });
        modal.close(); toast('Cotisation enregistrée'); rerender();
      });
    }
    const c = e.target.closest('[data-cancel]');
    if (c && await confirmBox('Annuler ce paiement de cotisation ?', { ok: 'Annuler le paiement' })) { db.remove('cotisations', c.dataset.cancel); rerender(); }
  });
}

/* ---------- Dons ---------- */
function tDons(main, rerender) {
  const dons = db.data.dons.slice().sort((a, b) => b.date.localeCompare(a.date));
  const recus = dons.filter((d) => d.statut === 'recu');
  const y = String(year());
  main.innerHTML = `
    <div class="spread"><h2>Dons</h2><div class="row"><button class="btn btn-ghost btn-sm" type="button" id="d-export"><i data-lucide="file-down"></i>Exporter (CSV)</button><button class="btn btn-primary btn-sm" type="button" id="d-add"><i data-lucide="plus"></i>Saisir un don</button></div></div>
    <div class="kpis">
      <div class="kpi"><span class="l">Reçus en ${y}</span><span class="v">${fmtEUR(recus.filter((d) => d.date.startsWith(y)).reduce((s, d) => s + Number(d.montant), 0))}</span></div>
      <div class="kpi"><span class="l">Dons mensuels actifs</span><span class="v">${recus.filter((d) => d.frequence === 'mensuel').length}</span></div>
      <div class="kpi"><span class="l">Promesses à confirmer</span><span class="v">${dons.filter((d) => d.statut === 'promesse').length}</span></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Donateur</th><th>Montant</th><th>État</th><th class="actions"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${dons.map((d) => `<tr>
        <td class="num">${esc(fmtDate(d.date))}</td>
        <td><b>${esc(d.nom)}</b>${exChip(d)}${d.message ? `<div class="sub">« ${esc(d.message)} »</div>` : ''}</td>
        <td class="num"><b>${fmtEUR(d.montant)}</b>${d.frequence === 'mensuel' ? ' <span class="chip blue">mensuel</span>' : ''}</td>
        <td>${d.statut === 'recu' ? '<span class="chip ok">Reçu</span>' : '<span class="chip warn">Promesse</span>'}</td>
        <td class="actions">${d.statut === 'promesse' ? `<button class="btn btn-blue btn-sm" type="button" data-recu="${d.id}">Marquer reçu</button>` : ''}
          <button class="icon-btn" type="button" data-deldon="${d.id}" aria-label="Supprimer ce don"><i data-lucide="trash-2"></i></button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Aucun don enregistré.</td></tr>'}</tbody>
    </table></div>
    <p class="small muted">Les dons faits sur le site arrivent en « promesse ». Marquez-les reçus quand le paiement apparaît sur HelloAsso ou sur le compte bancaire.</p>`;
  main.querySelector('#d-export').addEventListener('click', () => download(`dons-hbw-${todayISO()}.csv`, toCSV(dons.map((d) => ({ Date: d.date, Donateur: d.nom, 'E-mail': d.email, Montant: d.montant, Fréquence: d.frequence, État: d.statut, Mode: d.mode, Message: d.message }))), 'text/csv'));
  main.querySelector('#d-add').addEventListener('click', () => {
    const modal = openModal(`${modalHead('Saisir un don')}
      <form class="form" id="df"><div class="form-grid">
        <div class="field"><label for="df-nom">Donateur</label><input id="df-nom" name="nom" required></div>
        <div class="field"><label for="df-email">E-mail</label><input id="df-email" name="email" type="email"></div>
        <div class="field"><label for="df-montant">Montant (€)</label><input id="df-montant" name="montant" type="number" min="1" required></div>
        <div class="field"><label for="df-date">Date</label><input id="df-date" name="date" type="date" value="${todayISO()}" required></div>
        <div class="field"><label for="df-freq">Fréquence</label><select id="df-freq" name="frequence"><option value="unique">Ponctuel</option><option value="mensuel">Mensuel</option></select></div>
        <div class="field"><label for="df-mode">Mode</label><select id="df-mode" name="mode"><option value="helloasso">HelloAsso</option><option value="virement">Virement</option><option value="cheque">Chèque</option><option value="especes">Espèces</option><option value="nature">En nature</option></select></div>
      </div><div class="field"><label for="df-msg">Note</label><input id="df-msg" name="message"></div>
      <div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" type="button" data-dismiss>Annuler</button><button class="btn btn-primary" type="submit">Enregistrer</button></div></form>`);
    modal.el.querySelector('#df').addEventListener('submit', (e) => {
      e.preventDefault();
      db.insert('dons', { ...formData(e.target), statut: 'recu', anonyme: false, exemple: false });
      modal.close(); toast('Don enregistré'); rerender();
    });
  });
  main.addEventListener('click', async (e) => {
    const r = e.target.closest('[data-recu]');
    if (r) { db.update('dons', r.dataset.recu, { statut: 'recu' }); toast('Don marqué comme reçu'); rerender(); }
    const del = e.target.closest('[data-deldon]');
    if (del && await confirmBox('Supprimer ce don de la liste ?', { ok: 'Supprimer' })) { db.remove('dons', del.dataset.deldon); rerender(); }
  });
}

/* ---------- Événements ---------- */
function tAgenda(main, rerender) {
  const t = todayISO();
  const evs = db.data.evenements.slice().sort((a, b) => b.date.localeCompare(a.date));
  main.innerHTML = `
    <div class="spread"><h2>Événements</h2><button class="btn btn-primary btn-sm" type="button" id="e-add"><i data-lucide="plus"></i>Nouvel événement</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Événement</th><th>Inscrits</th><th class="actions"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${evs.map((e) => `<tr>
        <td class="num">${esc(fmtDate(e.date))}<div class="sub">${esc(e.heureDebut)}${e.heureFin ? '–' + esc(e.heureFin) : ''}</div></td>
        <td><b>${esc(e.titre)}</b>${exChip(e)} ${e.date < t ? '<span class="chip">passé</span>' : ''}<div class="sub">${esc(TYPES_EVENEMENT[e.type] || '')} · ${esc(e.lieu)}</div></td>
        <td class="num">${e.inscrits.length}${e.places ? ` / ${e.places}` : ''}</td>
        <td class="actions"><button class="btn btn-ghost btn-sm" type="button" data-inscrits="${e.id}">Inscrits</button>
          <button class="icon-btn" type="button" data-editev="${e.id}" aria-label="Modifier"><i data-lucide="pencil"></i></button></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Aucun événement.</td></tr>'}</tbody>
    </table></div>`;
  main.querySelector('#e-add').addEventListener('click', () => eventForm(null, rerender));
  main.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-editev]');
    if (ed) eventForm(db.find('evenements', ed.dataset.editev), rerender);
    const ins = e.target.closest('[data-inscrits]');
    if (ins) {
      const ev = db.find('evenements', ins.dataset.inscrits);
      openModal(`${modalHead('Inscrits', ev.titre)}<div data-copy-scope class="stack">
        ${ev.inscrits.length ? `<div class="table-wrap"><table><thead><tr><th>Nom</th><th>E-mail</th><th>Inscrit le</th></tr></thead><tbody>${ev.inscrits.map((i) => `<tr><td>${esc(i.nom)}</td><td>${esc(i.email)}</td><td class="num">${esc(fmtDate(i.date))}</td></tr>`).join('')}</tbody></table></div>
        <div class="copybox" data-copy-target>${esc(ev.inscrits.map((i) => i.email).join(', '))}</div>
        <button class="btn btn-ghost btn-sm" type="button" id="ins-copy" style="align-self:flex-start"><i data-lucide="copy"></i>Copier les e-mails</button>` : '<p class="muted">Personne n’est encore inscrit.</p>'}</div>`)
        .el.querySelector('#ins-copy')?.addEventListener('click', (x) => copy(ev.inscrits.map((i) => i.email).join(', '), x.currentTarget));
    }
  });
}

function eventForm(ev, rerender) {
  const isNew = !ev;
  ev = ev || { titre: '', type: 'action', date: addDays(todayISO(), 7), heureDebut: '10:00', heureFin: '12:00', lieu: '', description: '', places: 0, inscrits: [] };
  const modal = openModal(`${modalHead(isNew ? 'Nouvel événement' : 'Modifier l’événement')}
    <form class="form" id="ef">
      <div class="field"><label for="ef-titre">Titre</label><input id="ef-titre" name="titre" value="${esc(ev.titre)}" required></div>
      <div class="form-grid">
        <div class="field"><label for="ef-type">Type</label><select id="ef-type" name="type">${opt(TYPES_EVENEMENT, ev.type)}</select></div>
        <div class="field"><label for="ef-date">Date</label><input id="ef-date" name="date" type="date" value="${esc(ev.date)}" required></div>
        <div class="field"><label for="ef-hd">Début</label><input id="ef-hd" name="heureDebut" type="time" value="${esc(ev.heureDebut)}"></div>
        <div class="field"><label for="ef-hf">Fin</label><input id="ef-hf" name="heureFin" type="time" value="${esc(ev.heureFin)}"></div>
        <div class="field"><label for="ef-places">Places (0 = illimité)</label><input id="ef-places" name="places" type="number" min="0" value="${ev.places}"></div>
      </div>
      <div class="field"><label for="ef-lieu">Lieu</label><input id="ef-lieu" name="lieu" value="${esc(ev.lieu)}"></div>
      <div class="field"><label for="ef-desc">Description</label><textarea id="ef-desc" name="description">${esc(ev.description)}</textarea></div>
      <div class="spread">${isNew ? '<span></span>' : '<button class="btn btn-danger btn-sm" type="button" id="ef-del"><i data-lucide="trash-2"></i>Supprimer</button>'}
        <div class="row"><button class="btn btn-ghost" type="button" data-dismiss>Annuler</button><button class="btn btn-primary" type="submit">Publier</button></div></div>
    </form>`);
  modal.el.querySelector('#ef').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = formData(e.target);
    d.places = Number(d.places) || 0;
    if (isNew) db.insert('evenements', { ...d, inscrits: [], exemple: false }); else db.update('evenements', ev.id, d);
    modal.close(); toast(isNew ? 'Événement publié dans l’agenda' : 'Événement mis à jour'); rerender();
  });
  modal.el.querySelector('#ef-del')?.addEventListener('click', async () => {
    modal.close();
    if (await confirmBox(`Supprimer « ${ev.titre} » et ses ${ev.inscrits.length} inscription(s) ?`, { ok: 'Supprimer' })) { db.remove('evenements', ev.id); rerender(); }
  });
}

/* ---------- Flash vidéos et galerie ---------- */
function tMedias(main, rerender) {
  const flashs = db.data.flashs.slice().sort((a, b) => b.date.localeCompare(a.date));
  const medias = db.data.medias;
  main.innerHTML = `
    <div class="spread"><h2>Flash vidéos</h2><button class="btn btn-primary btn-sm" type="button" id="f-add"><i data-lucide="plus"></i>Nouveau flash</button></div>
    <div class="notice"><i data-lucide="info"></i><span>Collez le lien d’une vidéo YouTube (y compris Shorts), Vimeo, Facebook ou d’un fichier MP4, ou ajoutez seulement une image et un texte court. Format vertical conseillé, moins d’une minute.</span></div>
    <div class="table-wrap"><table><thead><tr><th>Date</th><th>Flash</th><th>Visible</th><th class="actions"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${flashs.map((f) => `<tr><td class="num">${esc(fmtDate(f.date))}</td><td><b>${esc(f.titre)}</b>${exChip(f)}<div class="sub">${f.videoUrl ? 'Vidéo · ' : ''}${esc(f.texte.slice(0, 80))}</div></td>
        <td>${f.publie ? '<span class="chip ok">En ligne</span>' : '<span class="chip">Brouillon</span>'}</td>
        <td class="actions"><button class="icon-btn" type="button" data-editf="${f.id}" aria-label="Modifier"><i data-lucide="pencil"></i></button></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Aucun flash.</td></tr>'}</tbody></table></div>
    <div class="spread" style="margin-top:12px"><h2>Galerie photos</h2><label class="btn btn-primary btn-sm" for="g-file"><i data-lucide="image-plus"></i>Ajouter des photos</label><input id="g-file" type="file" accept="image/*" multiple hidden></div>
    ${medias.length ? `<div class="gallery">${medias.map((m) => `<figure><img src="${esc(m.image)}" alt="${esc(m.titre)}"><figcaption class="spread"><span>${esc(m.titre)}</span><button class="icon-btn" type="button" data-delm="${m.id}" aria-label="Supprimer la photo"><i data-lucide="trash-2"></i></button></figcaption></figure>`).join('')}</div>` : '<div class="panel empty">Aucune photo pour le moment.</div>'}`;
  main.querySelector('#f-add').addEventListener('click', () => flashForm(null, rerender));
  main.querySelector('#g-file').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      const image = await readFileAsDataURL(file, 1280);
      db.insert('medias', { titre: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), image, date: todayISO(), exemple: false });
    }
    if (!db.save()) toast('Stockage plein : réduisez le nombre de photos ou passez à l’hébergement en ligne');
    else toast('Photos ajoutées à la galerie');
    rerender();
  });
  main.addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-editf]');
    if (ed) flashForm(db.find('flashs', ed.dataset.editf), rerender);
    const dm = e.target.closest('[data-delm]');
    if (dm && await confirmBox('Retirer cette photo de la galerie ?', { ok: 'Retirer' })) { db.remove('medias', dm.dataset.delm); rerender(); }
  });
}

function flashForm(f, rerender) {
  const isNew = !f;
  f = f || { titre: '', texte: '', videoUrl: '', image: '', couleur: 'bleu', date: todayISO(), publie: true };
  let image = f.image;
  const modal = openModal(`${modalHead(isNew ? 'Nouveau flash' : 'Modifier le flash')}
    <form class="form" id="ff">
      <div class="field"><label for="ff-titre">Titre</label><input id="ff-titre" name="titre" maxlength="60" value="${esc(f.titre)}" required></div>
      <div class="field"><label for="ff-texte">Texte court</label><textarea id="ff-texte" name="texte" maxlength="200" rows="3">${esc(f.texte)}</textarea></div>
      <div class="field"><label for="ff-video">Lien de la vidéo</label><input id="ff-video" name="videoUrl" type="url" placeholder="https://youtube.com/shorts/…" value="${esc(f.videoUrl)}"></div>
      <div class="form-grid">
        <div class="field"><label for="ff-img">Image de couverture</label><input id="ff-img" type="file" accept="image/*"></div>
        <div class="field"><label for="ff-coul">Couleur de fond</label><select id="ff-coul" name="couleur">${opt({ bleu: 'Bleu', rouge: 'Rouge', vert: 'Vert', or: 'Or' }, f.couleur)}</select></div>
        <div class="field"><label for="ff-date">Date</label><input id="ff-date" name="date" type="date" value="${esc(f.date)}"></div>
      </div>
      <label class="check"><input type="checkbox" name="publie" id="ff-pub" ${f.publie ? 'checked' : ''}><span>Visible sur le site</span></label>
      <div class="spread">${isNew ? '<span></span>' : '<button class="btn btn-danger btn-sm" type="button" id="ff-del"><i data-lucide="trash-2"></i>Supprimer</button>'}
        <div class="row"><button class="btn btn-ghost" type="button" data-dismiss>Annuler</button><button class="btn btn-primary" type="submit">Enregistrer</button></div></div>
    </form>`);
  modal.el.querySelector('#ff-img').addEventListener('change', async (e) => { if (e.target.files[0]) image = await readFileAsDataURL(e.target.files[0], 900); });
  modal.el.querySelector('#ff').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = { ...formData(e.target), image };
    if (isNew) db.insert('flashs', { ...d, exemple: false }); else db.update('flashs', f.id, d);
    modal.close(); toast('Flash enregistré'); rerender();
  });
  modal.el.querySelector('#ff-del')?.addEventListener('click', async () => {
    modal.close();
    if (await confirmBox(`Supprimer le flash « ${f.titre} » ?`, { ok: 'Supprimer' })) { db.remove('flashs', f.id); rerender(); }
  });
}

/* ---------- Instances : AG, CA, bureau ---------- */
function tInstances(main, rerender) {
  const t = todayISO();
  const list = db.data.instances.slice().sort((a, b) => b.date.localeCompare(a.date));
  const ca = db.data.instances.filter((i) => i.type === 'CA' && i.statut === 'tenue').sort((a, b) => b.date.localeCompare(a.date))[0];
  const caDue = !ca || addDays(ca.date, 182) < t;
  const ago = db.data.instances.filter((i) => i.type === 'AGO' && i.statut === 'tenue').sort((a, b) => b.date.localeCompare(a.date))[0];
  main.innerHTML = `
    <div class="spread"><h2>AG et conseils</h2><button class="btn btn-primary btn-sm" type="button" id="i-add"><i data-lucide="plus"></i>Planifier une réunion</button></div>
    <div class="kpis">
      <div class="kpi"><span class="l">Dernière AG ordinaire</span><span class="v" style="font-size:1.2rem">${ago ? esc(fmtDate(ago.date)) : 'Non renseignée'}</span><span class="small muted">Une par an (art. 8)</span></div>
      <div class="kpi"><span class="l">Dernier conseil d’administration</span><span class="v" style="font-size:1.2rem">${ca ? esc(fmtDate(ca.date)) : 'Non renseigné'}</span><span class="small ${caDue ? '' : 'muted'}">${caDue ? '<span class="chip warn">À réunir : au moins tous les 6 mois</span>' : 'Au moins tous les 6 mois (art. 10)'}</span></div>
    </div>
    ${list.length ? list.map((i) => {
      const lim = regles.dateLimiteConvocation(i);
      const etat = i.statut === 'tenue' ? '<span class="chip ok">Tenue</span>' : i.dateConvocation ? `<span class="chip ${i.dateConvocation <= lim ? 'blue' : 'bad'}">Convoquée le ${esc(fmtDate(i.dateConvocation))}${i.dateConvocation > lim ? ' (hors délai)' : ''}</span>` : lim < t ? '<span class="chip bad">Convocation en retard</span>' : `<span class="chip warn">Convoquer avant le ${esc(fmtDate(lim))}</span>`;
      return `<div class="panel stack">
        <div class="spread"><div><b>${esc(INSTANCES[i.type].label)}</b>${exChip(i)}<br><span class="muted small">${esc(fmtDate(i.date))} à ${esc(i.heure)} · ${esc(i.lieu)}</span></div>${etat}</div>
        <div class="row">
          <button class="btn btn-ghost btn-sm" type="button" data-conv="${i.id}"><i data-lucide="mail"></i>Convocation</button>
          <button class="btn btn-ghost btn-sm" type="button" data-pv="${i.id}"><i data-lucide="file-pen-line"></i>Procès-verbal</button>
          <button class="icon-btn" type="button" data-editi="${i.id}" aria-label="Modifier"><i data-lucide="pencil"></i></button>
        </div></div>`;
    }).join('') : '<div class="panel empty">Aucune réunion planifiée.</div>'}
    <p class="small muted">Délais de convocation : 15 jours pour les assemblées générales (art. 8 et 9), 8 jours pour le conseil d’administration (art. 10).</p>`;
  main.querySelector('#i-add').addEventListener('click', () => instanceForm(null, rerender));
  main.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-editi]');
    if (ed) instanceForm(db.find('instances', ed.dataset.editi), rerender);
    const cv = e.target.closest('[data-conv]');
    if (cv) convocation(db.find('instances', cv.dataset.conv), rerender);
    const pv = e.target.closest('[data-pv]');
    if (pv) pvForm(db.find('instances', pv.dataset.pv), rerender);
  });
}

function instanceForm(i, rerender) {
  const isNew = !i;
  i = i || { type: 'CA', date: addDays(todayISO(), 15), heure: '18:30', lieu: db.data.settings.siege, ordreDuJour: '', dateConvocation: '', presents: 0, representes: 0, pv: '', statut: 'planifiee' };
  const modal = openModal(`${modalHead(isNew ? 'Planifier une réunion' : 'Modifier la réunion')}
    <form class="form" id="if">
      <div class="form-grid">
        <div class="field"><label for="if-type">Instance</label><select id="if-type" name="type">${opt(INSTANCES, i.type)}</select></div>
        <div class="field"><label for="if-date">Date</label><input id="if-date" name="date" type="date" value="${esc(i.date)}" required></div>
        <div class="field"><label for="if-heure">Heure</label><input id="if-heure" name="heure" type="time" value="${esc(i.heure)}"></div>
      </div>
      <p class="small muted" id="if-lim"></p>
      <div class="field"><label for="if-lieu">Lieu</label><input id="if-lieu" name="lieu" value="${esc(i.lieu)}"></div>
      <div class="field"><label for="if-odj">Ordre du jour</label><textarea id="if-odj" name="ordreDuJour" rows="6">${esc(i.ordreDuJour)}</textarea><span class="hint">Seuls les points inscrits peuvent être délibérés en CA (art. 10).</span></div>
      <label class="check"><input type="checkbox" id="if-agenda" name="publierAgenda" ${isNew && i.type !== 'CA' ? 'checked' : ''}><span>Afficher aussi dans l’agenda public (pour les AG)</span></label>
      <div class="spread">${isNew ? '<span></span>' : '<button class="btn btn-danger btn-sm" type="button" id="if-del"><i data-lucide="trash-2"></i>Supprimer</button>'}
        <div class="row"><button class="btn btn-ghost" type="button" data-dismiss>Annuler</button><button class="btn btn-primary" type="submit">Enregistrer</button></div></div>
    </form>`);
  const f = modal.el.querySelector('#if');
  const lim = () => {
    const x = { type: f.type.value, date: f.date.value };
    const delai = INSTANCES[x.type].delai;
    modal.el.querySelector('#if-lim').textContent = delai && x.date ? `Convocations à envoyer au plus tard le ${fmtDate(regles.dateLimiteConvocation(x))} (${delai} jours, ${INSTANCES[x.type].article}).` : '';
  };
  f.addEventListener('change', lim); lim();
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const { publierAgenda, ...d } = formData(f);
    if (isNew) db.insert('instances', { ...i, ...d, exemple: false }); else db.update('instances', i.id, d);
    if (publierAgenda) db.insert('evenements', { titre: INSTANCES[d.type].label, type: 'ag', date: d.date, heureDebut: d.heure, heureFin: '', lieu: d.lieu, description: d.ordreDuJour, places: 0, inscrits: [], exemple: false });
    modal.close(); toast('Réunion enregistrée'); rerender();
  });
  modal.el.querySelector('#if-del')?.addEventListener('click', async () => {
    modal.close();
    if (await confirmBox('Supprimer cette réunion et son procès-verbal ?', { ok: 'Supprimer' })) { db.remove('instances', i.id); rerender(); }
  });
}

function convocation(i, rerender) {
  const s = db.data.settings;
  const isAG = i.type === 'AGO' || i.type === 'AGE';
  const y = parseISO(i.date).getFullYear();
  const dest = db.data.membres.filter((m) => m.statut === 'agree' && (isAG ? regles.estAJour(m, y) : !!m.fonction));
  const exclus = isAG ? db.data.membres.filter((m) => m.statut === 'agree' && !regles.estAJour(m, y)) : [];
  const pres = db.data.membres.find((m) => m.fonction === 'Président');
  const texte = `Objet : Convocation – ${INSTANCES[i.type].label} du ${fmtDate(i.date)}

Madame, Monsieur,

Conformément à l’${INSTANCES[i.type].article.toLowerCase().replace('art.', 'article')} des statuts de l’association ${s.nom} (${s.sigle}), vous êtes convoqué(e) à la ${INSTANCES[i.type].label.toLowerCase()} qui se tiendra le ${fmtDate(i.date)} à ${i.heure}, à l’adresse suivante : ${i.lieu}.

Ordre du jour :
${i.ordreDuJour || '(à compléter)'}
${isAG ? `
Seuls les membres à jour de leur cotisation à la date de la présente convocation peuvent participer aux votes. Si vous ne pouvez pas être présent(e), vous pouvez vous faire représenter par un autre membre.
` : `
Le vote par procuration est autorisé, chaque administrateur ne pouvant détenir qu’une seule procuration.
`}
Comptant sur votre présence,

${pres ? `${pres.prenom} ${pres.nom}, président` : 'Le président'}
${s.nom} · ${s.siege} · ${s.email}`;
  const emails = dest.map((m) => m.email).filter(Boolean).join(', ');
  const modal = openModal(`${modalHead('Convocation', `${INSTANCES[i.type].label} · ${fmtDate(i.date)}`)}
    <div class="stack" data-copy-scope>
      <p class="small"><b>${dest.length} destinataire${dest.length > 1 ? 's' : ''}</b> ${isAG ? '(membres agréés à jour de cotisation)' : '(membres du conseil et du bureau)'}${exclus.length ? ` · ${exclus.length} membre${exclus.length > 1 ? 's' : ''} non à jour exclu${exclus.length > 1 ? 's' : ''}` : ''}</p>
      <div class="copybox" data-copy-target>${esc(texte)}</div>
      <div class="row">
        <button class="btn btn-ghost btn-sm" type="button" id="cv-copy"><i data-lucide="copy"></i>Copier le texte</button>
        <button class="btn btn-ghost btn-sm" type="button" id="cv-mails"><i data-lucide="at-sign"></i>Copier les e-mails</button>
        <button class="btn btn-ghost btn-sm" type="button" id="cv-dl"><i data-lucide="file-down"></i>Télécharger</button>
      </div>
      ${i.dateConvocation ? `<div class="notice ok"><i data-lucide="check"></i>Envoyée le ${esc(fmtDate(i.dateConvocation))}</div>` : `<button class="btn btn-blue" type="button" id="cv-sent"><i data-lucide="send"></i>J’ai envoyé la convocation aujourd’hui</button>`}
    </div>`, { wide: true });
  modal.el.querySelector('#cv-copy').addEventListener('click', (e) => copy(texte, e.currentTarget));
  modal.el.querySelector('#cv-mails').addEventListener('click', (e) => copy(emails, e.currentTarget));
  modal.el.querySelector('#cv-dl').addEventListener('click', () => download(`convocation-${i.type}-${i.date}.txt`, texte));
  modal.el.querySelector('#cv-sent')?.addEventListener('click', () => {
    db.update('instances', i.id, { dateConvocation: todayISO(), statut: 'convoquee' });
    modal.close(); toast('Date d’envoi enregistrée'); rerender();
  });
}

function pvForm(i, rerender) {
  const s = db.data.settings;
  const modele = i.pv || `PROCÈS-VERBAL – ${INSTANCES[i.type].label.toUpperCase()}
${s.nom} (${s.sigle}) – RNA ${s.rna}

Le ${fmtDate(i.date)} à ${i.heure}, les membres se sont réunis à : ${i.lieu}.
Présents : ${i.presents || '…'}   Représentés : ${i.representes || '…'}
Président de séance : …   Secrétaire de séance : …

Ordre du jour :
${i.ordreDuJour}

Délibérations :
1. …
   Vote : pour … / contre … / abstention … → adoptée / rejetée

L’ordre du jour étant épuisé, la séance est levée à …

Le président                         Le secrétaire`;
  const modal = openModal(`${modalHead('Procès-verbal', `${INSTANCES[i.type].label} · ${fmtDate(i.date)}`)}
    <form class="form" id="pvf">
      <div class="form-grid">
        <div class="field"><label for="pv-pres">Membres présents</label><input id="pv-pres" name="presents" type="number" min="0" value="${i.presents || 0}"></div>
        <div class="field"><label for="pv-rep">Membres représentés</label><input id="pv-rep" name="representes" type="number" min="0" value="${i.representes || 0}"></div>
      </div>
      <p class="small muted" id="pv-maj"></p>
      <div class="field"><label for="pv-txt">Texte du procès-verbal</label><textarea id="pv-txt" name="pv" rows="16" style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:0.88rem">${esc(modele)}</textarea></div>
      <label class="check"><input type="checkbox" id="pv-tenue" name="tenue" ${i.statut === 'tenue' ? 'checked' : ''}><span>La réunion a eu lieu (archiver au registre)</span></label>
      <div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" type="button" id="pv-dl"><i data-lucide="file-down"></i>Télécharger</button><button class="btn btn-primary" type="submit">Enregistrer</button></div>
    </form>`, { wide: true });
  const f = modal.el.querySelector('#pvf');
  const maj = () => {
    const n = (Number(f.presents.value) || 0) + (Number(f.representes.value) || 0);
    modal.el.querySelector('#pv-maj').textContent = n ? `Majorité absolue : ${Math.floor(n / 2) + 1} voix sur ${n} (art. 8). En cas d’égalité, la voix du président est prépondérante.` : '';
  };
  f.addEventListener('input', maj); maj();
  modal.el.querySelector('#pv-dl').addEventListener('click', () => download(`PV-${i.type}-${i.date}.txt`, f.pv.value));
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = formData(f);
    db.update('instances', i.id, { presents: d.presents, representes: d.representes, pv: d.pv, statut: d.tenue ? 'tenue' : (i.dateConvocation ? 'convoquee' : 'planifiee') });
    modal.close(); toast('Procès-verbal enregistré'); rerender();
  });
}

/* ---------- Messages ---------- */
function tMessages(main, rerender) {
  const msgs = db.data.messages.slice().sort((a, b) => b.date.localeCompare(a.date));
  main.innerHTML = `<h2>Messages reçus</h2>
    ${msgs.length ? msgs.map((m) => `<div class="panel stack" data-copy-scope>
      <div class="spread"><div><b>${esc(m.nom)}</b> ${m.lu ? '' : '<span class="chip warn">Nouveau</span>'}${exChip(m)}<br><span class="small muted">${esc(m.sujet)} · ${esc(fmtDate(m.date))}</span></div>
        <div class="row">${m.lu ? '' : `<button class="btn btn-ghost btn-sm" type="button" data-lu="${m.id}">Marquer lu</button>`}<button class="icon-btn" type="button" data-delmsg="${m.id}" aria-label="Supprimer"><i data-lucide="trash-2"></i></button></div></div>
      <p>${esc(m.texte)}</p>
      <p class="small">Répondre à : <span data-copy-target>${esc(m.email)}</span> <button class="btn btn-ghost btn-sm" type="button" data-copymail="${esc(m.email)}"><i data-lucide="copy"></i>Copier</button></p>
    </div>`).join('') : '<div class="panel empty">Aucun message.</div>'}`;
  main.addEventListener('click', async (e) => {
    const lu = e.target.closest('[data-lu]');
    if (lu) { db.update('messages', lu.dataset.lu, { lu: true }); rerender(); }
    const cm = e.target.closest('[data-copymail]');
    if (cm) copy(cm.dataset.copymail, cm);
    const del = e.target.closest('[data-delmsg]');
    if (del && await confirmBox('Supprimer ce message ?', { ok: 'Supprimer' })) { db.remove('messages', del.dataset.delmsg); rerender(); }
  });
}

/* ---------- Paramètres ---------- */
function tParametres(main, rerender) {
  const s = db.data.settings;
  const nbEx = ['membres', 'cotisations', 'dons', 'evenements', 'flashs', 'medias', 'instances', 'messages'].reduce((n, c) => n + db.data[c].filter((x) => x.exemple).length, 0);
  main.innerHTML = `<h2>Paramètres</h2>
    <form class="panel form" id="sf">
      <h3>Identité de l’association</h3>
      <div class="form-grid">
        <div class="field"><label for="sf-email">E-mail public</label><input id="sf-email" name="email" type="email" value="${esc(s.email)}"><span class="hint">Le logo indique « hopebetterword » : vérifiez l’orthographe.</span></div>
        <div class="field"><label for="sf-tel">Téléphone public</label><input id="sf-tel" name="tel" value="${esc(s.tel)}"></div>
        <div class="field"><label for="sf-fb">Page Facebook</label><input id="sf-fb" name="facebook" type="url" value="${esc(s.facebook || '')}"></div>
        <div class="field"><label for="sf-siege">Siège social</label><input id="sf-siege" name="siege" value="${esc(s.siege)}"></div>
      </div>
      <h3>Cotisations ${year()} <span class="small muted">(fixées par l’assemblée générale, art. 5)</span></h3>
      <div class="form-grid">
        <div class="field"><label for="sf-actif">Membre actif (€)</label><input id="sf-actif" name="c_actif" type="number" min="0" value="${s.cotisations.actif}"></div>
        <div class="field"><label for="sf-fond">Membre fondateur (€)</label><input id="sf-fond" name="c_fondateur" type="number" min="0" value="${s.cotisations.fondateur}"></div>
        <div class="field"><label for="sf-bien">Membre bienfaiteur (€)</label><input id="sf-bien" name="c_bienfaiteur" type="number" min="0" value="${s.cotisations.bienfaiteur}"></div>
        <div class="field"><label for="sf-entree">Droit d’entrée bienfaiteur (€)</label><input id="sf-entree" name="c_bienfaiteurEntree" type="number" min="0" value="${s.cotisations.bienfaiteurEntree}"></div>
        <div class="field"><label for="sf-morale">Personne morale (€)</label><input id="sf-morale" name="c_morale" type="number" min="0" value="${s.cotisations.morale}"></div>
      </div>
      <h3>Paiement en ligne (HelloAsso)</h3>
      <div class="form-grid">
        <div class="field"><label for="sf-ha-adh">Lien de la campagne d’adhésion</label><input id="sf-ha-adh" name="helloassoAdhesion" type="url" placeholder="https://www.helloasso.com/associations/…/adhesions/…" value="${esc(s.helloassoAdhesion)}"></div>
        <div class="field"><label for="sf-ha-don">Lien du formulaire de don</label><input id="sf-ha-don" name="helloassoDon" type="url" placeholder="https://www.helloasso.com/associations/…/formulaires/…" value="${esc(s.helloassoDon)}"></div>
      </div>
      <label class="check"><input type="checkbox" name="recuFiscal" id="sf-rf" ${s.recuFiscal ? 'checked' : ''}><span>L’association est habilitée à délivrer des reçus fiscaux (intérêt général reconnu). Affiche la mention de réduction d’impôt de 66 %.</span></label>
      <h3>Accès à l’espace gestion</h3>
      <div class="field" style="max-width:320px"><label for="sf-code">Code d’accès</label><input id="sf-code" name="codeGestion" value="${esc(s.codeGestion)}" required minlength="6"></div>
      <button class="btn btn-primary" type="submit" style="justify-self:start">Enregistrer les paramètres</button>
    </form>
    <div class="panel stack">
      <h3>Données</h3>
      <p class="muted small">Sauvegardez régulièrement. Dans cette version, les données restent dans ce navigateur ; la mise en ligne avec base de données partagée est décrite dans le guide de déploiement.</p>
      <div class="row">
        <button class="btn btn-ghost btn-sm" type="button" id="x-export"><i data-lucide="download"></i>Sauvegarder (JSON)</button>
        <label class="btn btn-ghost btn-sm" for="x-import"><i data-lucide="upload"></i>Restaurer une sauvegarde</label><input id="x-import" type="file" accept="application/json,.json" hidden>
        ${nbEx ? `<button class="btn btn-ghost btn-sm" type="button" id="x-clear"><i data-lucide="eraser"></i>Supprimer les ${nbEx} exemples</button>` : ''}
        <button class="btn btn-danger btn-sm" type="button" id="x-reset"><i data-lucide="rotate-ccw"></i>Réinitialiser la démo</button>
      </div>
    </div>`;
  main.querySelector('#sf').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = formData(e.target);
    const cot = {};
    for (const [k, v] of Object.entries(d)) if (k.startsWith('c_')) { cot[k.slice(2)] = Number(v) || 0; delete d[k]; }
    Object.assign(s, d, { cotisations: { ...s.cotisations, ...cot } });
    db.save();
    window.dispatchEvent(new Event('hbw:refresh-chrome'));
    toast('Paramètres enregistrés'); rerender();
  });
  main.querySelector('#x-export').addEventListener('click', () => download(`sauvegarde-hbw-${todayISO()}.json`, JSON.stringify(db.data, null, 2), 'application/json'));
  main.querySelector('#x-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { db.importJSON(await file.text()); toast('Sauvegarde restaurée'); rerender(); }
    catch (err) { toast('Ce fichier n’est pas une sauvegarde Hope Better World valide'); }
  });
  main.querySelector('#x-clear')?.addEventListener('click', async () => {
    if (await confirmBox('Supprimer toutes les données d’exemple (membres, dons, événements…) ? Les membres fondateurs et vos propres saisies sont conservés.', { ok: 'Supprimer les exemples' })) { db.clearExamples(); toast('Exemples supprimés'); rerender(); }
  });
  main.querySelector('#x-reset').addEventListener('click', async () => {
    if (await confirmBox('Effacer toutes les données saisies et revenir à la démonstration de départ ?', { ok: 'Réinitialiser' })) { db.reset(); toast('Démo réinitialisée'); rerender(); }
  });
}
