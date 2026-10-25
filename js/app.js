import { db, regles, todayISO, CATEGORIES, TYPES_EVENEMENT, ACTIONS } from './data.js';
import { STATUTS } from './statuts.js';
import {
  esc, fmtDate, fmtDateLong, fmtMonthShort, fmtEUR, initials, icons, toast, openModal, modalHead,
  formData, download, copy, videoEmbed, ics, googleCalUrl, parseISO,
} from './ui.js';
import { renderAdmin } from './admin.js';

const PAGES = {
  accueil: { label: 'Accueil', icon: 'house', render: pageAccueil },
  actions: { label: 'Nos actions', icon: 'heart-handshake', render: pageActions },
  flash: { label: 'Flash vidéos', icon: 'clapperboard', render: pageFlash },
  agenda: { label: 'Agenda', icon: 'calendar-days', render: pageAgenda },
  association: { label: "L'association", icon: 'landmark', render: pageAssociation },
  adherer: { label: 'Adhérer', icon: 'user-plus', render: pageAdherer },
  don: { label: 'Faire un don', icon: 'heart', render: pageDon },
  contact: { label: 'Contact', icon: 'mail', render: pageContact },
  gestion: { label: 'Espace gestion', icon: 'lock', render: (el) => renderAdmin(el) },
};
const MAIN_NAV = ['actions', 'flash', 'agenda', 'association', 'adherer', 'contact'];
const TABS = ['accueil', 'flash', 'don', 'agenda', 'adherer'];
const ACTION_COLORS = ['var(--red)', 'var(--blue)', 'var(--oxblood)', 'var(--blue)', 'var(--green)', 'var(--green)', 'var(--red)', 'var(--blue)'];

const S = () => db.data.settings;

/* ---------- Navigation ---------- */
function currentPage() {
  const h = location.hash.replace('#', '');
  return PAGES[h] ? h : 'accueil';
}

function renderChrome(page) {
  const link = (k, cls = '') => `<a href="#${k}" class="${cls}" ${k === page ? 'aria-current="page"' : ''}>${esc(PAGES[k].label)}</a>`;
  document.getElementById('mainnav').innerHTML = MAIN_NAV.map((k) => link(k)).join('');
  document.getElementById('drawernav').innerHTML = Object.keys(PAGES).map((k) =>
    `<a href="#${k}" ${k === page ? 'aria-current="page"' : ''}><i data-lucide="${PAGES[k].icon}"></i>${esc(PAGES[k].label)}</a>`).join('');
  document.getElementById('tabbar').innerHTML = TABS.map((k) => k === 'don'
    ? `<a href="#don" class="tab-don" ${k === page ? 'aria-current="page"' : ''}><span class="pill"><i data-lucide="heart"></i>Don</span></a>`
    : `<a href="#${k}" ${k === page ? 'aria-current="page"' : ''}><i data-lucide="${PAGES[k].icon}"></i>${esc(k === 'accueil' ? 'Accueil' : PAGES[k].label.replace(' vidéos', ''))}</a>`).join('');
  document.getElementById('header-don').hidden = page === 'don';
  renderFooter();
}

function renderFooter() {
  const s = S();
  document.getElementById('footer-cols').innerHTML = `
    <div class="stack" style="gap:8px">
      <h4>${esc(s.nom)} (${esc(s.sigle)})</h4>
      <p>Association loi 1901 qui œuvre pour l’épanouissement des communautés urbaines et rurales.</p>
    </div>
    <div class="stack" style="gap:6px">
      <h4>Nous écrire</h4>
      <p>${esc(s.siege)}</p>
      <p><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></p>
      ${s.tel ? `<p>${esc(s.tel)}</p>` : ''}
      ${s.facebook ? `<p><a href="${esc(s.facebook)}" target="_blank" rel="noopener" class="row" style="gap:8px;display:inline-flex"><i data-lucide="facebook"></i>Suivez-nous sur Facebook</a></p>` : ''}
      ${s.youtube ? `<p><a href="${esc(s.youtube)}" target="_blank" rel="noopener" class="row" style="gap:8px;display:inline-flex"><i data-lucide="youtube"></i>Notre chaîne YouTube</a></p>` : ''}
    </div>
    <div class="stack" style="gap:6px">
      <h4>Agir avec nous</h4>
      <a href="#adherer">Devenir membre</a><a href="#don">Faire un don</a><a href="#agenda">Participer à un événement</a><a href="#gestion">Espace gestion (bureau)</a>
    </div>`;
  document.getElementById('footer-legal').innerHTML = `
    <span>RNA ${esc(s.rna)}</span><span>SIRET ${esc(s.siret)}</span><span>APE ${esc(s.ape)}</span>
    <span>© ${new Date().getFullYear()} ${esc(s.nom)}</span>`;
}

function route() {
  const page = currentPage();
  closeDrawer();
  renderChrome(page);
  /* Nouvel élément à chaque page : les écouteurs de la page précédente disparaissent avec lui. */
  const old = document.getElementById('app');
  const app = old.cloneNode(false);
  old.replaceWith(app);
  PAGES[page].render(app);
  document.title = page === 'accueil' ? 'Hope Better World' : `${PAGES[page].label} · Hope Better World`;
  icons();
  window.scrollTo({ top: 0 });
}

function openDrawer() {
  document.getElementById('drawer').hidden = false;
  document.getElementById('menu-btn').setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  document.getElementById('drawer').hidden = true;
  document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

/* ---------- Composants publics ---------- */
const sectionHead = (eyebrow, title, lead = '') => `
  <div class="section-head"><span class="eyebrow">${esc(eyebrow)}</span><h2>${esc(title)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>`;

function flashCard(f) {
  const v = videoEmbed(f.videoUrl);
  const bg = f.image ? `<img src="${esc(f.image)}" alt="" loading="lazy">` : (v?.thumb ? `<img src="${esc(v.thumb)}" alt="" loading="lazy">` : '<span class="globe"></span>');
  return `<button class="flash-card flash-${esc(f.couleur || 'bleu')}" type="button" data-flash="${esc(f.id)}">
    ${bg}<span class="shade"></span>
    <span class="tag">${esc(fmtDate(f.date))}</span>
    ${v ? '<span class="play"><i data-lucide="play"></i></span>' : ''}
    <span class="body"><b>${esc(f.titre)}</b><span>${esc(f.texte)}</span></span>
  </button>`;
}

function openFlash(id) {
  const f = db.find('flashs', id);
  if (!f) return;
  const v = videoEmbed(f.videoUrl);
  let media = '';
  if (v?.kind === 'iframe') media = `<div class="modal-video ${v.vertical ? '' : 'landscape'}"><iframe src="${esc(v.src)}" title="${esc(f.titre)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
    <p class="small muted" style="margin-top:8px">La vidéo ne s’affiche pas ? <a href="${esc(f.videoUrl)}" target="_blank" rel="noopener">Ouvrir la vidéo</a></p>`;
  else if (v?.kind === 'video') media = `<div class="modal-video"><video src="${esc(v.src)}" controls autoplay playsinline></video></div>`;
  else if (v?.kind === 'link') media = `<p><a class="btn btn-blue" href="${esc(v.src)}" target="_blank" rel="noopener"><i data-lucide="external-link"></i>Voir la vidéo</a></p>`;
  else if (f.image) media = `<img src="${esc(f.image)}" alt="" style="border-radius:14px;width:100%">`;
  openModal(`${modalHead(f.titre, fmtDate(f.date))}<div class="stack">${media}<p>${esc(f.texte)}</p></div>`);
}

function eventItem(e) {
  return `<button class="event" type="button" data-event="${esc(e.id)}">
    <span class="date"><span>${esc(fmtMonthShort(e.date))}</span><b>${parseISO(e.date).getDate()}</b></span>
    <span class="stack" style="gap:2px;min-width:0">
      <span class="row" style="gap:6px"><span class="chip ${e.type === 'ag' ? 'blue' : ''}">${esc(TYPES_EVENEMENT[e.type] || 'Événement')}</span></span>
      <h4>${esc(e.titre)}</h4>
      <span class="meta"><span>${esc(e.heureDebut || '')}${e.heureFin ? ' – ' + esc(e.heureFin) : ''}</span><span>${esc(e.lieu)}</span></span>
    </span>
  </button>`;
}

function openEvent(id) {
  const e = db.find('evenements', id);
  if (!e) return;
  const restantes = e.places ? e.places - e.inscrits.length : null;
  const complet = restantes !== null && restantes <= 0;
  const m = openModal(`${modalHead(e.titre, TYPES_EVENEMENT[e.type] || '')}
    <div class="stack">
      <div class="notice"><i data-lucide="calendar-clock"></i><div><b>${esc(fmtDateLong(e.date))}</b><br>${esc(e.heureDebut)}${e.heureFin ? ' – ' + esc(e.heureFin) : ''} · ${esc(e.lieu)}</div></div>
      <p>${esc(e.description)}</p>
      <div class="row">
        <button class="btn btn-ghost btn-sm" type="button" id="ev-ics"><i data-lucide="calendar-plus"></i>Ajouter à mon agenda</button>
        <a class="btn btn-ghost btn-sm" href="${esc(googleCalUrl(e))}" target="_blank" rel="noopener"><i data-lucide="external-link"></i>Google Agenda</a>
      </div>
      ${e.type === 'ag' ? '<p class="small muted">Réservée aux membres à jour de leur cotisation (statuts, art. 8).</p>' : ''}
      <form class="form panel" id="ev-form" ${complet ? 'hidden' : ''}>
        <h3>Je m’inscris</h3>
        ${restantes !== null ? `<p class="small muted">${restantes} place${restantes > 1 ? 's' : ''} restante${restantes > 1 ? 's' : ''}</p>` : ''}
        <div class="form-grid">
          <div class="field"><label for="ev-nom">Nom et prénom</label><input id="ev-nom" name="nom" required autocomplete="name"></div>
          <div class="field"><label for="ev-email">E-mail</label><input id="ev-email" name="email" type="email" required autocomplete="email"></div>
        </div>
        <button class="btn btn-primary" type="submit">Confirmer mon inscription</button>
      </form>
      ${complet ? '<div class="notice warn"><i data-lucide="users"></i>Cet événement est complet.</div>' : ''}
    </div>`);
  m.el.querySelector('#ev-ics').addEventListener('click', () => download(`${e.titre}.ics`, ics(e), 'text/calendar'));
  m.el.querySelector('#ev-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const d = formData(ev.target);
    if (e.inscrits.some((i) => i.email.toLowerCase() === d.email.toLowerCase())) { toast('Vous êtes déjà inscrit·e à cet événement'); return; }
    db.update('evenements', e.id, { inscrits: [...e.inscrits, { nom: d.nom, email: d.email, date: todayISO() }] });
    m.close();
    toast('Inscription enregistrée, à bientôt !');
  });
}

function upcomingEvents(limit = 99) {
  const t = todayISO();
  return db.data.evenements.filter((e) => e.date >= t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}

function bindCommon(el) {
  el.addEventListener('click', (e) => {
    const f = e.target.closest('[data-flash]');
    if (f) openFlash(f.dataset.flash);
    const ev = e.target.closest('[data-event]');
    if (ev) openEvent(ev.dataset.event);
  });
}

/* ---------- Pages ---------- */
function pageAccueil(el) {
  const s = S();
  const d = db.data;
  const membres = d.membres.filter((m) => m.statut === 'agree').length;
  const flashs = d.flashs.filter((f) => f.publie).sort((a, b) => b.date.localeCompare(a.date));
  const events = upcomingEvents(3);
  el.innerHTML = `
  <section class="hero">
    <div class="wrap">
      <div class="stack" style="gap:18px">
        <span class="hero-stripes" aria-hidden="true"><i></i><i></i><i></i></span>
        <h1>Œuvrer pour <span class="red">l’épanouissement</span> des communautés <span class="blue">urbaines et rurales</span></h1>
        <p class="lead">${esc(s.nom)} (${esc(s.sigle)}) porte assistance aux personnes les plus démunies : alimentation, santé, éducation, droits de l’enfant, environnement et agriculture bio.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#don"><i data-lucide="heart"></i>Faire un don</a>
          <a class="btn btn-ghost" href="#adherer"><i data-lucide="user-plus"></i>Devenir membre</a>
        </div>
        <div class="idcard"><span>Association loi 1901</span><span>RNA <b>${esc(s.rna)}</b></span><span>SIRET <b>${esc(s.siret)}</b></span></div>
      </div>
      <div class="hero-seal"><span class="ring" aria-hidden="true"></span><img src="img/logo.jpg" alt="Logo Hope Better World : une poignée de main sous une carte du monde entourée de lauriers"></div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="spread" style="margin-bottom:20px">
        ${sectionHead('Flash vidéos', 'En direct du terrain').replace('margin-bottom:28px', '')}
        <a class="btn btn-ghost btn-sm" href="#flash">Tout voir<i data-lucide="arrow-right"></i></a>
      </div>
      ${flashs.length ? `<div class="flash-rail">${flashs.map(flashCard).join('')}</div>` : '<p class="muted">Les premières vidéos arrivent bientôt.</p>'}
    </div>
  </section>

  <section class="section section-alt">
    <div class="wrap">
      ${sectionHead('Nos domaines d’action', 'Huit engagements inscrits dans nos statuts')}
      <div class="grid-cards">${ACTIONS.slice(0, 4).map(actionCard).join('')}</div>
      <p style="margin-top:20px"><a class="btn btn-ghost" href="#actions">Voir les 8 domaines<i data-lucide="arrow-right"></i></a></p>
    </div>
  </section>

  <section class="section">
    <div class="wrap split">
      <div class="stack" style="gap:14px">
        ${sectionHead('Agenda', 'Prochains rendez-vous')}
        ${events.length ? events.map(eventItem).join('') : '<p class="muted">Aucun événement programmé pour le moment.</p>'}
        <a class="btn btn-ghost" href="#agenda" style="align-self:flex-start">Ouvrir le calendrier<i data-lucide="arrow-right"></i></a>
      </div>
      <div class="panel stack" style="gap:16px">
        <span class="eyebrow">Ensemble</span>
        <h3>Une communauté qui grandit</h3>
        <div class="stats">
          <div class="stat"><b>${membres}</b><span>membres</span></div>
          <div class="stat"><b>${upcomingEvents().length}</b><span>événements à venir</span></div>
          <div class="stat"><b>8</b><span>domaines d’action</span></div>
          <div class="stat"><b>2019</b><span>année de création</span></div>
        </div>
        <a class="btn btn-blue" href="#adherer">Rejoindre l’association</a>
      </div>
    </div>
  </section>`;
  bindCommon(el);
}

function actionCard(a, i) {
  return `<article class="card action-card" style="--c:${ACTION_COLORS[i % ACTION_COLORS.length]}">
    <span class="ico"><i data-lucide="${a.icon}"></i></span><h3>${esc(a.titre)}</h3><p>${esc(a.texte)}</p></article>`;
}

function pageActions(el) {
  el.innerHTML = `
  <section class="section"><div class="wrap">
    ${sectionHead('Nos actions', 'Ce que nous faisons, et pourquoi', 'Nos missions découlent de l’article 2 de nos statuts : porter assistance aux couches sociales déshéritées et contribuer à l’épanouissement des communautés, ici et dans les pays partenaires.')}
    <div class="grid-cards">${ACTIONS.map(actionCard).join('')}</div>
  </div></section>
  <section class="section section-alt"><div class="wrap split">
    <div class="stack">
      <span class="eyebrow">Bénévolat</span><h2>Donnez de votre temps</h2>
      <p class="lead">Collectes, ateliers, accompagnement scolaire, chantiers solidaires : chaque compétence est utile. Écrivez-nous ou inscrivez-vous à un prochain événement.</p>
      <div class="row"><a class="btn btn-primary" href="#agenda">Voir l’agenda</a><a class="btn btn-ghost" href="#contact">Proposer mon aide</a></div>
    </div>
    <div class="panel stack"><h3>Partenaires</h3><p class="muted">Collectivités, ONG, entreprises et institutions : l’association collabore avec les acteurs publics et privés (statuts, art. 2). Contactez le bureau pour bâtir un projet commun.</p><a class="btn btn-blue" href="#contact">Devenir partenaire</a></div>
  </div></section>`;
}

function pageFlash(el) {
  const flashs = db.data.flashs.filter((f) => f.publie).sort((a, b) => b.date.localeCompare(a.date));
  const medias = db.data.medias.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  el.innerHTML = `
  <section class="section"><div class="wrap">
    ${sectionHead('Flash vidéos', 'Nos actions en images', 'De courtes vidéos et des nouvelles du terrain. Touchez une carte pour la lire.')}
    ${flashs.length ? `<div class="flash-rail">${flashs.map(flashCard).join('')}</div>` : '<p class="muted">Aucune vidéo publiée pour le moment.</p>'}
    <p class="row" style="margin-top:16px">${S().youtube ? `<a class="btn btn-primary" href="${esc(S().youtube)}" target="_blank" rel="noopener"><i data-lucide="youtube"></i>Toutes nos vidéos sur YouTube</a>` : ''}${S().facebook ? `<a class="btn btn-ghost" href="${esc(S().facebook)}" target="_blank" rel="noopener"><i data-lucide="facebook"></i>Notre page Facebook</a>` : ''}</p>
  </div></section>
  <section class="section section-alt"><div class="wrap">
    ${sectionHead('Galerie', 'Photos de nos actions')}
    ${medias.length ? `<div class="gallery">${medias.map((m) => `<figure>${m.image ? `<img src="${esc(m.image)}" alt="${esc(m.titre)}" loading="lazy">` : '<div class="ph"><i data-lucide="image"></i></div>'}<figcaption><b>${esc(m.titre)}</b>${m.date ? `<br><span class="muted small">${esc(fmtDate(m.date))}</span>` : ''}</figcaption></figure>`).join('')}</div>`
      : `<div class="panel empty"><i data-lucide="images"></i><p>La galerie est vide. Le bureau peut y ajouter des photos depuis l’espace gestion.</p></div>`}
  </div></section>`;
  bindCommon(el);
}

function pageAgenda(el) {
  let view = new Date(); view.setDate(1);
  let selected = null;
  el.innerHTML = `<section class="section"><div class="wrap">
    ${sectionHead('Agenda', 'Calendrier des événements', 'Inscrivez-vous en un clic et ajoutez les dates à votre agenda.')}
    <div class="cal-layout"><div class="cal" id="cal"></div><div class="stack" id="cal-list"></div></div>
  </div></section>`;
  const cal = el.querySelector('#cal');
  const list = el.querySelector('#cal-list');
  const events = () => db.data.evenements.slice().sort((a, b) => a.date.localeCompare(b.date));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  function draw() {
    const y = view.getFullYear(), mo = view.getMonth();
    const start = new Date(y, mo, 1);
    const offset = (start.getDay() + 6) % 7;
    start.setDate(1 - offset);
    const byDay = {};
    for (const e of events()) (byDay[e.date] ||= []).push(e);
    const t = todayISO();
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = iso(d);
      const evs = byDay[k] || [];
      cells += `<button type="button" class="cal-day ${d.getMonth() !== mo ? 'out' : ''} ${k === t ? 'today' : ''} ${k === selected ? 'sel' : ''}" data-day="${k}" aria-label="${esc(fmtDateLong(k))}${evs.length ? `, ${evs.length} événement(s)` : ''}">
        ${d.getDate()}<span class="dots">${evs.slice(0, 3).map(() => '<i></i>').join('')}</span></button>`;
    }
    cal.innerHTML = `<div class="cal-head">
        <button class="icon-btn" type="button" data-nav="-1" aria-label="Mois précédent"><i data-lucide="chevron-left"></i></button>
        <h3>${esc(new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(view))}</h3>
        <button class="icon-btn" type="button" data-nav="1" aria-label="Mois suivant"><i data-lucide="chevron-right"></i></button>
      </div>
      <div class="cal-grid">${['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((d) => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>`;
    const shown = selected ? events().filter((e) => e.date === selected) : events().filter((e) => e.date >= todayISO());
    list.innerHTML = `<div class="spread"><h3>${selected ? esc(fmtDateLong(selected)) : 'À venir'}</h3>${selected ? '<button class="btn btn-ghost btn-sm" type="button" data-all>Tout afficher</button>' : ''}</div>
      ${shown.length ? shown.map(eventItem).join('') : '<p class="muted">Aucun événement ce jour-là.</p>'}`;
    icons();
  }
  el.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { view.setMonth(view.getMonth() + Number(nav.dataset.nav)); draw(); return; }
    const day = e.target.closest('[data-day]');
    if (day) { selected = day.dataset.day === selected ? null : day.dataset.day; draw(); return; }
    if (e.target.closest('[data-all]')) { selected = null; draw(); }
  });
  bindCommon(el);
  draw();
}

function pageAssociation(el) {
  const d = db.data;
  const bureau = d.membres.filter((m) => m.fonction && m.statut === 'agree');
  el.innerHTML = `
  <section class="section"><div class="wrap split">
    <div class="stack" style="gap:16px">
      ${sectionHead('L’association', 'Hope Better World, pour un monde meilleur')}
      <p class="lead">Association loi 1901 fondée à Paris le 3 août 2019, ${esc(d.settings.sigle)} agit pour l’épanouissement des communautés urbaines et rurales et porte assistance aux couches sociales déshéritées.</p>
      <h3 style="margin-top:12px">Le bureau</h3>
      <div class="people">${bureau.map((m) => `<div class="person card"><span class="avatar">${esc(initials(m.prenom, m.nom))}</span><div><b>${esc(m.prenom)} ${esc(m.nom)}</b><br><span class="muted small">${esc(m.fonction)}</span></div></div>`).join('')}</div>
    </div>
    <div class="panel stack">
      <h3>Fiche d’identité</h3>
      <dl class="stack" style="gap:8px;margin:0">
        ${[['Dénomination', `${d.settings.nom} (Pour un monde meilleur)`], ['Sigle', d.settings.sigle], ['Siège social', d.settings.siege], ['N° RNA', d.settings.rna], ['SIRET', d.settings.siret], ['Code APE', `${d.settings.ape} (autres organisations fonctionnant par adhésion volontaire)`], ['Durée', 'Illimitée']]
          .map(([k, v]) => `<div><dt class="small muted">${esc(k)}</dt><dd style="margin:0;font-weight:600">${esc(v)}</dd></div>`).join('')}
      </dl>
      <a class="btn btn-ghost" href="docs/statuts-hbw.pdf" target="_blank" rel="noopener"><i data-lucide="file-text"></i>Statuts signés (PDF)</a>
      ${d.settings.facebook ? `<a class="btn btn-ghost" href="${esc(d.settings.facebook)}" target="_blank" rel="noopener"><i data-lucide="facebook"></i>Page Facebook</a>` : ''}
      ${d.settings.youtube ? `<a class="btn btn-ghost" href="${esc(d.settings.youtube)}" target="_blank" rel="noopener"><i data-lucide="youtube"></i>Chaîne YouTube</a>` : ''}
    </div>
  </div></section>
  <section class="section section-alt"><div class="wrap">
    ${sectionHead('Transparence', 'Nos statuts', 'Le texte intégral, article par article.')}
    <div class="panel articles">${STATUTS.map((a) => `<details ${a.n <= 2 ? 'open' : ''}><summary>Article ${a.n} · ${esc(a.titre)}</summary><div class="art-body">${a.p.map((p) => `<p>${esc(p)}</p>`).join('')}${a.liste ? `<ul>${a.liste.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</div></details>`).join('')}
      <p class="small muted" style="padding-top:14px">Fait à Paris, le 3 août 2019. Signé par Damtoti DJAGBARE, président, et Amah NOUMON, vice-président.</p>
    </div>
  </div></section>`;
}

function pageAdherer(el) {
  const s = S();
  const c = s.cotisations;
  const cats = [
    { k: 'actif', titre: 'Membre actif', prix: c.actif, detail: 'Cotisation annuelle' },
    { k: 'bienfaiteur', titre: 'Membre bienfaiteur', prix: c.bienfaiteur, detail: `Cotisation annuelle + droit d’entrée de ${fmtEUR(c.bienfaiteurEntree)}` },
    { k: 'morale', titre: 'Personne morale', prix: c.morale, detail: 'Association, entreprise ou collectivité' },
  ];
  el.innerHTML = `<section class="section"><div class="wrap split">
    <form class="panel form" id="adh-form" novalidate>
      ${sectionHead('Adhésion ' + new Date().getFullYear(), 'Devenir membre')}
      <fieldset class="stack" style="border:0;padding:0;margin:0">
        <legend class="label" style="font-weight:600;margin-bottom:8px">Catégorie de membre</legend>
        <div class="choice-grid">${cats.map((x, i) => `<label class="choice"><input type="radio" name="categorie" value="${x.k}" ${i === 0 ? 'checked' : ''}><span class="box"><b>${esc(x.titre)}</b><span class="price">${fmtEUR(x.prix)}<span class="small muted" style="font-weight:600"> / an</span></span><span class="small muted">${esc(x.detail)}</span></span></label>`).join('')}</div>
      </fieldset>
      <div class="field" id="rs-field" hidden><label for="adh-rs">Raison sociale</label><input id="adh-rs" name="raisonSociale" autocomplete="organization"><span class="hint">Indiquez ci-dessous le représentant légal (statuts, art. 5).</span></div>
      <div class="form-grid">
        <div class="field"><label for="adh-prenom">Prénom</label><input id="adh-prenom" name="prenom" required autocomplete="given-name"></div>
        <div class="field"><label for="adh-nom">Nom</label><input id="adh-nom" name="nom" required autocomplete="family-name"></div>
        <div class="field"><label for="adh-email">E-mail</label><input id="adh-email" name="email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="adh-tel">Téléphone</label><input id="adh-tel" name="tel" type="tel" autocomplete="tel"></div>
        <div class="field"><label for="adh-adresse">Adresse</label><input id="adh-adresse" name="adresse" autocomplete="street-address"></div>
        <div class="field"><label for="adh-ville">Ville</label><input id="adh-ville" name="ville" autocomplete="address-level2"></div>
        <div class="field"><label for="adh-pays">Pays</label><input id="adh-pays" name="pays" value="France" autocomplete="country-name"></div>
      </div>
      <div class="field"><label for="adh-motiv">Pourquoi nous rejoindre ? <span class="muted">(facultatif)</span></label><textarea id="adh-motiv" name="motivation" rows="3"></textarea></div>
      <label class="check"><input type="checkbox" name="statuts" id="adh-statuts" required><span>J’ai lu les <a href="#association">statuts de l’association</a> et je m’engage à les respecter.</span></label>
      <label class="check"><input type="checkbox" name="rgpd" id="adh-rgpd" required><span>J’accepte que mes données soient utilisées par l’association pour la gestion des adhésions. Je peux demander leur suppression à tout moment.</span></label>
      <p class="small muted" id="adh-error" role="alert"></p>
      <button class="btn btn-primary" type="submit"><i data-lucide="send"></i>Envoyer ma demande d’adhésion</button>
    </form>
    <aside class="stack">
      <div class="panel stack"><h3>Comment ça marche ?</h3>
        <ol class="stack" style="margin:0;padding-left:20px;gap:8px">
          <li>Vous envoyez votre demande avec ce formulaire.</li>
          <li>Vous réglez votre cotisation en ligne${s.helloassoAdhesion ? ' sur HelloAsso' : ''} ou auprès du trésorier.</li>
          <li>Le conseil d’administration agrée votre adhésion (statuts, art. 5) et vous recevez la confirmation.</li>
        </ol>
      </div>
      <div class="notice"><i data-lucide="info"></i><span>Les membres d’honneur sont désignés par l’association et dispensés de cotisation. Les montants sont fixés chaque année par l’assemblée générale.</span></div>
    </aside>
  </div></section>`;
  const form = el.querySelector('#adh-form');
  const rs = el.querySelector('#rs-field');
  form.addEventListener('change', () => { rs.hidden = form.categorie.value !== 'morale'; });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const d = formData(form);
    const err = el.querySelector('#adh-error');
    if (!d.prenom || !d.nom || !/^\S+@\S+\.\S+$/.test(d.email)) { err.textContent = 'Merci d’indiquer votre prénom, votre nom et une adresse e-mail valide.'; return; }
    if (!d.statuts || !d.rgpd) { err.textContent = 'Merci de cocher les deux cases d’engagement pour continuer.'; return; }
    if (db.data.membres.some((m) => m.email && m.email.toLowerCase() === d.email.toLowerCase() && m.statut !== 'radie')) { err.textContent = 'Une adhésion existe déjà avec cette adresse e-mail. Écrivez-nous si besoin.'; return; }
    db.insert('membres', {
      civilite: '', prenom: d.prenom, nom: d.nom.toUpperCase(), email: d.email, tel: d.tel, adresse: d.adresse, ville: d.ville, pays: d.pays,
      categorie: d.categorie, raisonSociale: d.raisonSociale || '', statut: 'attente', fonction: '', motivation: d.motivation,
      dateDemande: todayISO(), dateAgrement: '', motifRadiation: '', exemple: false,
    });
    const montant = regles.montantCotisation(d.categorie) + (d.categorie === 'bienfaiteur' ? s.cotisations.bienfaiteurEntree : 0);
    el.querySelector('.wrap').innerHTML = `<div class="panel stack" style="gap:16px;max-width:640px">
      <div class="notice ok"><i data-lucide="check-circle-2"></i><b>Merci ${esc(d.prenom)}, votre demande d’adhésion est bien enregistrée.</b></div>
      <p>Montant à régler pour ${new Date().getFullYear()} : <b class="num">${fmtEUR(montant)}</b>.</p>
      ${s.helloassoAdhesion ? `<a class="btn btn-primary" href="${esc(s.helloassoAdhesion)}" target="_blank" rel="noopener"><i data-lucide="credit-card"></i>Payer ma cotisation sur HelloAsso</a>`
        : `<p class="muted">Le trésorier vous contactera à l’adresse ${esc(d.email)} pour le règlement (virement, chèque ou espèces).</p>`}
      <p class="small muted">Votre adhésion devient effective après l’agrément du conseil d’administration.</p>
      <a class="btn btn-ghost" href="#accueil">Retour à l’accueil</a>
    </div>`;
    icons();
    window.scrollTo({ top: 0 });
  });
}

function pageDon(el) {
  const s = S();
  const montants = [10, 20, 50, 100, 200];
  el.innerHTML = `<section class="section"><div class="wrap split">
    <form class="panel form" id="don-form" novalidate>
      ${sectionHead('Soutenir', 'Faire un don', 'Votre don finance directement nos actions : aide alimentaire, matériel médical, fournitures scolaires, projets agricoles.')}
      <div class="seg" role="group" aria-label="Fréquence du don">
        <button type="button" data-freq="unique" aria-pressed="true">Don ponctuel</button>
        <button type="button" data-freq="mensuel" aria-pressed="false">Don mensuel</button>
      </div>
      <fieldset style="border:0;padding:0;margin:0" class="stack">
        <legend class="label" style="font-weight:600;margin-bottom:8px">Montant</legend>
        <div class="amounts">${montants.map((m, i) => `<label class="choice"><input type="radio" name="montantChoix" value="${m}" ${i === 2 ? 'checked' : ''}><span class="box">${m} €</span></label>`).join('')}
          <label class="choice"><input type="radio" name="montantChoix" value="autre"><span class="box">Autre</span></label></div>
      </fieldset>
      <div class="field" id="autre-field" hidden><label for="don-autre">Montant libre (€)</label><input id="don-autre" name="montantLibre" type="number" min="1" step="1" inputmode="numeric"></div>
      <p class="impact notice" id="don-impact"></p>
      <div class="form-grid">
        <div class="field"><label for="don-nom">Nom et prénom</label><input id="don-nom" name="nom" autocomplete="name"></div>
        <div class="field"><label for="don-email">E-mail</label><input id="don-email" name="email" type="email" autocomplete="email"></div>
      </div>
      <div class="field"><label for="don-msg">Un mot pour l’équipe <span class="muted">(facultatif)</span></label><textarea id="don-msg" name="message" rows="2"></textarea></div>
      <label class="check"><input type="checkbox" name="anonyme" id="don-anon"><span>Je souhaite rester anonyme sur les communications de l’association.</span></label>
      <p class="small muted" id="don-error" role="alert"></p>
      <button class="btn btn-primary" type="submit" id="don-submit"><i data-lucide="heart"></i><span>Je donne</span></button>
    </form>
    <aside class="stack">
      <div class="panel stack"><h3>Paiement sécurisé</h3><p class="muted">${s.helloassoDon ? 'Le paiement est finalisé sur HelloAsso, la plateforme de paiement gratuite des associations françaises (carte bancaire, sans frais pour l’association).' : 'Le paiement en ligne sera ouvert dès que le bureau aura relié la page de don HelloAsso. En attendant, votre promesse de don est transmise au trésorier, qui vous indiquera comment régler.'}</p></div>
      ${s.recuFiscal ? '<div class="notice ok"><i data-lucide="receipt"></i><span>Vous recevrez un reçu fiscal : 66 % de votre don est déductible de l’impôt sur le revenu, dans la limite de 20 % du revenu imposable.</span></div>' : ''}
      <div class="panel stack"><h3>Autres façons d’aider</h3><p class="muted">Dons en nature (matériel médical, fournitures, vêtements), mécénat de compétences ou bénévolat.</p><a class="btn btn-ghost" href="#contact">Nous contacter</a></div>
    </aside>
  </div></section>`;
  const form = el.querySelector('#don-form');
  let freq = 'unique';
  const montant = () => (form.montantChoix.value === 'autre' ? Number(form.montantLibre.value) || 0 : Number(form.montantChoix.value));
  const impacts = [[200, 'finance un kit de matériel médical de premiers secours'], [100, 'équipe une classe entière en fournitures scolaires'], [50, 'fournit un colis alimentaire à une famille pour un mois'], [20, 'achète les semences d’un potager bio partagé'], [1, 'contribue à l’ensemble de nos actions']];
  function refresh() {
    el.querySelector('#autre-field').hidden = form.montantChoix.value !== 'autre';
    const m = montant();
    const txt = impacts.find(([seuil]) => m >= seuil)?.[1];
    el.querySelector('#don-impact').textContent = m ? `Exemple : ${fmtEUR(m)}${freq === 'mensuel' ? ' par mois' : ''} ${txt}.` : 'Choisissez un montant.';
    el.querySelector('#don-submit span').textContent = m ? `Je donne ${fmtEUR(m)}${freq === 'mensuel' ? ' / mois' : ''}` : 'Je donne';
  }
  el.querySelectorAll('[data-freq]').forEach((b) => b.addEventListener('click', () => {
    freq = b.dataset.freq;
    el.querySelectorAll('[data-freq]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    refresh();
  }));
  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  refresh();
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const d = formData(form);
    const m = montant();
    const err = el.querySelector('#don-error');
    if (m < 1) { err.textContent = 'Indiquez un montant d’au moins 1 €.'; return; }
    if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) { err.textContent = 'L’adresse e-mail ne semble pas valide.'; return; }
    db.insert('dons', { nom: d.anonyme ? 'Anonyme' : (d.nom || 'Anonyme'), email: d.email, montant: m, frequence: freq, date: todayISO(), statut: 'promesse', mode: s.helloassoDon ? 'helloasso' : 'a-definir', message: d.message, anonyme: d.anonyme, exemple: false });
    el.querySelector('.wrap').innerHTML = `<div class="panel stack" style="gap:16px;max-width:640px">
      <div class="notice ok"><i data-lucide="heart"></i><b>Merci pour votre générosité${d.nom && !d.anonyme ? ', ' + esc(d.nom.split(' ')[0]) : ''} !</b></div>
      <p>Don ${freq === 'mensuel' ? 'mensuel' : 'ponctuel'} de <b class="num">${fmtEUR(m)}</b>.</p>
      ${s.helloassoDon ? `<a class="btn btn-primary" href="${esc(s.helloassoDon)}" target="_blank" rel="noopener"><i data-lucide="credit-card"></i>Finaliser le paiement sur HelloAsso</a><p class="small muted">Le paiement s’ouvre dans un nouvel onglet. Indiquez le même montant.</p>`
        : `<p class="muted">Votre promesse de don est transmise au trésorier${d.email ? `, qui vous écrira à ${esc(d.email)}` : ''}. Vous pouvez aussi nous écrire à ${esc(s.email)}.</p>`}
      <a class="btn btn-ghost" href="#accueil">Retour à l’accueil</a>
    </div>`;
    icons();
    window.scrollTo({ top: 0 });
  });
}

function pageContact(el) {
  const s = S();
  el.innerHTML = `<section class="section"><div class="wrap split">
    <form class="panel form" id="ct-form">
      ${sectionHead('Contact', 'Écrivez-nous')}
      <div class="form-grid">
        <div class="field"><label for="ct-nom">Nom et prénom</label><input id="ct-nom" name="nom" required autocomplete="name"></div>
        <div class="field"><label for="ct-email">E-mail</label><input id="ct-email" name="email" type="email" required autocomplete="email"></div>
      </div>
      <div class="field"><label for="ct-sujet">Sujet</label>
        <select id="ct-sujet" name="sujet"><option>Question générale</option><option>Devenir bénévole</option><option>Partenariat</option><option>Don en nature</option><option>Presse</option></select></div>
      <div class="field"><label for="ct-texte">Message</label><textarea id="ct-texte" name="texte" required rows="5"></textarea></div>
      <button class="btn btn-primary" type="submit"><i data-lucide="send"></i>Envoyer le message</button>
    </form>
    <aside class="stack">
      <div class="panel stack" data-copy-scope>
        <h3>Coordonnées</h3>
        <p><b>Siège social</b><br>${esc(s.siege)}</p>
        <p><b>E-mail</b><br><span data-copy-target>${esc(s.email)}</span></p>
        <button class="btn btn-ghost btn-sm" type="button" id="copy-mail" style="align-self:flex-start"><i data-lucide="copy"></i>Copier l’adresse</button>
        ${s.tel ? `<p><b>Téléphone</b><br>${esc(s.tel)}</p>` : ''}
      </div>
      ${s.facebook ? `<a class="btn btn-blue" href="${esc(s.facebook)}" target="_blank" rel="noopener"><i data-lucide="facebook"></i>Notre page Facebook</a>` : ''}
      ${s.youtube ? `<a class="btn btn-primary" href="${esc(s.youtube)}" target="_blank" rel="noopener"><i data-lucide="youtube"></i>Notre chaîne YouTube</a>` : ''}
      <a class="btn btn-ghost" href="https://www.openstreetmap.org/search?query=${encodeURIComponent(s.siege)}" target="_blank" rel="noopener"><i data-lucide="map-pin"></i>Voir sur la carte</a>
    </aside>
  </div></section>`;
  el.querySelector('#copy-mail').addEventListener('click', (e) => copy(s.email, e.currentTarget));
  el.querySelector('#ct-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const d = formData(ev.target);
    db.insert('messages', { ...d, date: todayISO(), lu: false, exemple: false });
    ev.target.reset();
    toast('Message envoyé. Nous vous répondrons rapidement.');
  });
}

/* ---------- Démarrage ---------- */
document.getElementById('menu-btn').addEventListener('click', openDrawer);
document.getElementById('drawer-close').addEventListener('click', closeDrawer);
window.addEventListener('hashchange', route);
window.addEventListener('hbw:refresh-chrome', () => { renderChrome(currentPage()); icons(); });

/* Installation comme application (Android, Windows, macOS, ChromeOS ; iOS via « Ajouter à l’écran d’accueil ») */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  document.getElementById('install-btn').hidden = false;
});
document.getElementById('install-btn').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  document.getElementById('install-btn').hidden = true;
});
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

route();
