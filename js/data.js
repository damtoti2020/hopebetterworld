/* Couche de données de Hope Better World.
 * Mode actuel : stockage local du navigateur (démonstration, une seule machine).
 * Pour la production, remplacer load()/persist() par un adaptateur Supabase
 * (voir docs/DEPLOIEMENT.md) : le reste de l'application ne change pas. */

const STORAGE_KEY = 'hbw-data-v1';
const FACEBOOK = 'https://www.facebook.com/profile.php?id=100067997473253';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const CATEGORIES = {
  fondateur: { label: 'Membre fondateur', court: 'Fondateur', cotise: true },
  honneur: { label: "Membre d'honneur", court: 'Honneur', cotise: false },
  bienfaiteur: { label: 'Membre bienfaiteur', court: 'Bienfaiteur', cotise: true },
  actif: { label: 'Membre actif (adhérent)', court: 'Actif', cotise: true },
  morale: { label: 'Personne morale', court: 'Pers. morale', cotise: true },
};

const STATUTS_MEMBRE = {
  attente: "En attente d'agrément",
  agree: 'Agréé',
  radie: 'Radié',
};

const TYPES_EVENEMENT = {
  action: 'Action solidaire',
  collecte: 'Collecte',
  formation: 'Formation / atelier',
  sensibilisation: 'Sensibilisation',
  rencontre: 'Rencontre',
  ag: 'Assemblée générale',
};

/* Délais de convocation fixés par les statuts (art. 8 et 10). */
const INSTANCES = {
  AGO: { label: 'Assemblée générale ordinaire', delai: 15, article: 'Art. 8' },
  AGE: { label: 'Assemblée générale extraordinaire', delai: 15, article: 'Art. 9' },
  CA: { label: "Conseil d'administration", delai: 8, article: 'Art. 10' },
  BUREAU: { label: 'Réunion du bureau', delai: 0, article: 'Art. 12' },
};

const ACTIONS = [
  { icon: 'wheat', titre: 'Lutte contre la pauvreté', texte: 'Lutter contre la pauvreté, la famine et la malnutrition auprès des couches sociales déshéritées.' },
  { icon: 'stethoscope', titre: 'Matériel médical', texte: 'Aider à apporter du matériel médical dans les pays qui en manquent.' },
  { icon: 'baby', titre: "Droits de l'enfant", texte: 'Contribuer à la défense et à la promotion des droits des enfants.' },
  { icon: 'graduation-cap', titre: 'Éducation et formation', texte: 'Promouvoir la scolarité et la formation professionnelle des jeunes : séminaires, colloques, chantiers, ateliers, conférences.' },
  { icon: 'trees', titre: 'Environnement', texte: 'Protéger l’environnement, lutter contre la déforestation et le réchauffement climatique.' },
  { icon: 'sprout', titre: 'Agriculture bio', texte: 'Développer l’agriculture biologique : sensibiliser, former, éduquer et informer en ville comme à la campagne.' },
  { icon: 'hand-heart', titre: 'Volontariat', texte: 'Promouvoir le volontariat national et international.' },
  { icon: 'handshake', titre: 'Partenariats', texte: 'Collaborer avec les pouvoirs publics, les collectivités locales, les ONG et les institutions nationales et internationales.' },
];

function seed() {
  const t = todayISO();
  const year = new Date().getFullYear();
  const m = (id, prenom, nom, categorie, extra = {}) => ({
    id, civilite: '', prenom, nom, email: '', tel: '', adresse: '', ville: '', pays: 'France',
    categorie, raisonSociale: '', statut: 'agree', fonction: '', dateDemande: '2019-08-03',
    dateAgrement: '2019-08-03', motifRadiation: '', exemple: false, ...extra,
  });
  return {
    version: 1,
    settings: {
      nom: 'HOPE BETTER WORLD',
      sousTitre: 'Pour un monde meilleur',
      sigle: 'H.B.W',
      rna: 'W751253775',
      siret: '753 753 983 00019',
      ape: '9499Z',
      siege: '15 rue Crespin du Gast, 75011 Paris',
      email: 'hopebetterword@gmail.com',
      tel: '',
      facebook: FACEBOOK,
      helloassoAdhesion: '',
      helloassoDon: '',
      cotisations: { actif: 20, bienfaiteur: 50, bienfaiteurEntree: 10, morale: 100, fondateur: 20 },
      recuFiscal: false,
      codeGestion: 'hbw2026',
    },
    membres: [
      m('m-djagbare', 'Damtoti', 'DJAGBARE', 'fondateur', { fonction: 'Président' }),
      m('m-noumon', 'Amah', 'NOUMON', 'fondateur', { fonction: 'Vice-président' }),
      m('m-ex1', 'Awa', 'KONÉ', 'actif', { exemple: true, email: 'awa.exemple@mail.fr', ville: 'Paris', dateDemande: addDays(t, -120), dateAgrement: addDays(t, -110) }),
      m('m-ex2', 'Julien', 'MARTIN', 'bienfaiteur', { exemple: true, email: 'julien.exemple@mail.fr', ville: 'Montreuil', dateDemande: addDays(t, -60), dateAgrement: addDays(t, -50) }),
      m('m-ex3', 'Koffi', 'MENSAH', 'actif', { exemple: true, email: 'koffi.exemple@mail.fr', ville: 'Lomé', pays: 'Togo', statut: 'attente', dateDemande: addDays(t, -3), dateAgrement: '' }),
      m('m-ex4', 'Collectif', 'Jardins Partagés 11e', 'morale', { exemple: true, raisonSociale: 'Collectif Jardins Partagés 11e', email: 'contact.exemple@jardins.fr', dateDemande: addDays(t, -200), dateAgrement: addDays(t, -190) }),
    ],
    cotisations: [
      { id: uid(), membreId: 'm-djagbare', annee: year, montant: 20, date: `${year}-01-15`, mode: 'virement', exemple: false },
      { id: uid(), membreId: 'm-ex1', annee: year, montant: 20, date: addDays(t, -110), mode: 'helloasso', exemple: true },
      { id: uid(), membreId: 'm-ex2', annee: year, montant: 60, date: addDays(t, -50), mode: 'cheque', exemple: true },
    ],
    dons: [
      { id: uid(), nom: 'Marie D.', email: '', montant: 50, frequence: 'unique', date: addDays(t, -90), statut: 'recu', mode: 'helloasso', message: 'Pour le matériel médical.', anonyme: false, exemple: true },
      { id: uid(), nom: 'Anonyme', email: '', montant: 20, frequence: 'mensuel', date: addDays(t, -40), statut: 'recu', mode: 'helloasso', message: '', anonyme: true, exemple: true },
      { id: uid(), nom: 'Paul A.', email: '', montant: 100, frequence: 'unique', date: addDays(t, -12), statut: 'recu', mode: 'virement', message: 'Bon courage à toute l’équipe.', anonyme: false, exemple: true },
      { id: uid(), nom: 'Fatou S.', email: '', montant: 30, frequence: 'unique', date: addDays(t, -2), statut: 'promesse', mode: 'helloasso', message: '', anonyme: false, exemple: true },
    ],
    evenements: [
      { id: uid(), titre: 'Collecte de fournitures scolaires', type: 'collecte', date: addDays(t, 6), heureDebut: '10:00', heureFin: '17:00', lieu: 'Paris 11e', description: 'Cahiers, stylos, cartables : déposez vos dons, ils partiront pour les écoles partenaires.', places: 0, inscrits: [], exemple: true },
      { id: uid(), titre: 'Atelier jardinage bio en ville', type: 'formation', date: addDays(t, 13), heureDebut: '14:00', heureFin: '16:30', lieu: 'Jardin partagé, Paris 11e', description: 'Compost, semis et cultures sans pesticides. Ouvert à toutes et tous, enfants bienvenus.', places: 20, inscrits: [{ nom: 'Awa K.', email: 'awa.exemple@mail.fr', date: t }], exemple: true },
      { id: uid(), titre: 'Assemblée générale ordinaire', type: 'ag', date: addDays(t, 27), heureDebut: '18:30', heureFin: '20:30', lieu: 'Siège : 15 rue Crespin du Gast, Paris 11e', description: 'Rapport moral et financier, approbation des comptes, élection du conseil d’administration. Réservée aux membres à jour de cotisation.', places: 0, inscrits: [], exemple: true },
    ],
    flashs: [
      { id: uid(), titre: 'Bienvenue sur le nouveau site', texte: 'Adhérez, faites un don et suivez nos actions depuis votre téléphone.', videoUrl: '', image: '', couleur: 'bleu', date: t, publie: true, exemple: true },
      { id: uid(), titre: 'Collecte scolaire', texte: 'Nous collectons des fournitures pour la rentrée. Chaque cahier compte.', videoUrl: '', image: '', couleur: 'rouge', date: addDays(t, -4), publie: true, exemple: true },
      { id: uid(), titre: 'Jardins bio', texte: 'Retour en images sur notre premier atelier de jardinage biologique.', videoUrl: '', image: '', couleur: 'vert', date: addDays(t, -15), publie: true, exemple: true },
    ],
    medias: [],
    instances: [
      { id: uid(), type: 'AGO', date: addDays(t, 27), heure: '18:30', lieu: '15 rue Crespin du Gast, 75011 Paris', ordreDuJour: '1. Rapport moral du président\n2. Rapport financier du trésorier\n3. Approbation des comptes de l’exercice clos\n4. Fixation des cotisations\n5. Élection du conseil d’administration (bulletin secret)\n6. Questions diverses', dateConvocation: '', presents: 0, representes: 0, pv: '', statut: 'planifiee', exemple: true },
    ],
    messages: [
      { id: uid(), nom: 'Claire B.', email: 'claire.exemple@mail.fr', sujet: 'Devenir bénévole', texte: 'Bonjour, je souhaite aider lors de la prochaine collecte. Comment faire ?', date: addDays(t, -1), lu: false, exemple: true },
    ],
  };
}

let memory = null;

function load() {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) memory = JSON.parse(raw);
  } catch (e) { /* stockage indisponible : on reste en mémoire */ }
  if (!memory || memory.version !== 1) memory = seed();
  if (memory.settings.facebook === undefined) memory.settings.facebook = FACEBOOK;
  return memory;
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memory)); return true; }
  catch (e) { return false; }
}

const db = {
  get data() { return load(); },
  save() { return persist(); },
  insert(col, item) { load()[col].push({ id: uid(), ...item }); persist(); },
  update(col, id, patch) {
    const it = load()[col].find((x) => x.id === id);
    if (it) Object.assign(it, patch);
    persist();
    return it;
  },
  remove(col, id) { const d = load(); d[col] = d[col].filter((x) => x.id !== id); persist(); },
  find(col, id) { return load()[col].find((x) => x.id === id); },
  reset() { memory = seed(); persist(); },
  clearExamples() {
    const d = load();
    for (const col of ['membres', 'cotisations', 'dons', 'evenements', 'flashs', 'medias', 'instances', 'messages']) {
      d[col] = d[col].filter((x) => !x.exemple);
    }
    persist();
  },
  importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.membres)) throw new Error('Fichier non reconnu');
    memory = parsed;
    persist();
  },
};

/* Règles métier dérivées des statuts */
const regles = {
  cotisationDue(membre) { return CATEGORIES[membre.categorie]?.cotise !== false; },
  estAJour(membre, annee = new Date().getFullYear()) {
    if (!regles.cotisationDue(membre)) return true;
    return db.data.cotisations.some((c) => c.membreId === membre.id && c.annee === annee);
  },
  montantCotisation(categorie) {
    const c = db.data.settings.cotisations;
    return c[categorie] ?? 0;
  },
  dateLimiteConvocation(instance) {
    const delai = INSTANCES[instance.type]?.delai ?? 0;
    return addDays(instance.date, -delai);
  },
};

export { db, regles, uid, todayISO, addDays, CATEGORIES, STATUTS_MEMBRE, TYPES_EVENEMENT, INSTANCES, ACTIONS };
