/* Petits utilitaires d'interface partagés par le site public et l'espace de gestion. */

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const dateLongFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const parseISO = (iso) => new Date(iso + 'T12:00:00');
export const fmtDate = (iso) => (iso ? dateFmt.format(parseISO(iso)) : '');
export const fmtDateLong = (iso) => (iso ? dateLongFmt.format(parseISO(iso)) : '');
export const fmtMonthShort = (iso) => monthShort.format(parseISO(iso)).replace('.', '');
export const fmtEUR = (n) => eur.format(Number(n) || 0);
export const initials = (p, n) => ((p?.[0] || '') + (n?.[0] || '')).toUpperCase();

export function icons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
}

let toastTimer;
export function toast(msg) {
  const root = document.getElementById('toast-root');
  root.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { root.innerHTML = ''; }, 3200);
}

let lastFocus = null;
export function openModal(html, { wide = false, onClose } = {}) {
  const root = document.getElementById('modal-root');
  lastFocus = document.activeElement;
  root.innerHTML = `<div class="modal-backdrop" data-close><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  const backdrop = root.firstElementChild;
  const close = () => {
    root.innerHTML = '';
    document.removeEventListener('keydown', onKey);
    onClose?.();
    lastFocus?.focus?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-dismiss]')) close();
  });
  icons();
  const first = backdrop.querySelector('input, select, textarea, button:not([data-dismiss])');
  (first || backdrop.querySelector('.modal')).focus?.();
  return { el: backdrop.querySelector('.modal'), close };
}

export const modalHead = (title, sub = '') => `
  <div class="modal-head">
    <div class="stack" style="gap:4px"><h3>${esc(title)}</h3>${sub ? `<p class="muted small">${esc(sub)}</p>` : ''}</div>
    <button class="icon-btn" type="button" data-dismiss aria-label="Fermer"><i data-lucide="x"></i></button>
  </div>`;

/* Confirmation intégrée à la page (les boîtes confirm() natives ne sont pas fiables partout). */
export function confirmBox(message, { ok = 'Confirmer', danger = true } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    const m = openModal(`${modalHead('Confirmation')}
      <p>${esc(message)}</p>
      <div class="row" style="justify-content:flex-end;margin-top:20px">
        <button class="btn btn-ghost" type="button" data-dismiss>Annuler</button>
        <button class="btn ${danger ? 'btn-primary' : 'btn-blue'}" type="button" id="confirm-ok">${esc(ok)}</button>
      </div>`, { onClose: () => { if (!answered) resolve(false); } });
    m.el.querySelector('#confirm-ok').addEventListener('click', () => { answered = true; resolve(true); m.close(); });
  });
}

export function formData(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
    else if (el.type === 'number') out[el.name] = el.value === '' ? '' : Number(el.value);
    else if (el.type !== 'file') out[el.name] = el.value.trim();
  }
  return out;
}

export function download(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export async function copy(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copié dans le presse-papiers');
  } catch (e) {
    const box = btn?.closest('[data-copy-scope]')?.querySelector('[data-copy-target]');
    if (box) {
      const range = document.createRange();
      range.selectNodeContents(box);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      toast('Texte sélectionné : copiez-le avec Ctrl+C ou un appui long');
    } else toast('Copie impossible sur cet appareil');
  }
}

export function toCSV(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\uFEFF' + [cols.map(cell).join(';'), ...rows.map((r) => cols.map((c) => cell(r[c])).join(';'))].join('\n');
}

export function readFileAsDataURL(file, maxSize = 1280) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      if (!file.type.startsWith('image/')) { resolve(reader.result); return; }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* Vidéos : YouTube, Vimeo, Facebook ou fichier MP4. */
export function videoEmbed(url) {
  if (!url) return null;
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0`, vertical: url.includes('/shorts/'), thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` };
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return { kind: 'iframe', src: `https://player.vimeo.com/video/${m[1]}?autoplay=1`, vertical: false };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url) || url.startsWith('data:video')) return { kind: 'video', src: url, vertical: true };
  return { kind: 'link', src: url };
}

export function ics(evt) {
  const d = evt.date.replace(/-/g, '');
  const t = (h) => (h || '00:00').replace(':', '') + '00';
  const clean = (s) => String(s || '').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hope Better World//Agenda//FR', 'BEGIN:VEVENT',
    `UID:${evt.id}@hopebetterworld.org`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Paris:${d}T${t(evt.heureDebut)}`,
    `DTEND;TZID=Europe/Paris:${d}T${t(evt.heureFin || evt.heureDebut)}`,
    `SUMMARY:${clean(evt.titre)}`, `LOCATION:${clean(evt.lieu)}`, `DESCRIPTION:${clean(evt.description)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export function googleCalUrl(evt) {
  const d = evt.date.replace(/-/g, '');
  const t = (h) => (h || '00:00').replace(':', '') + '00';
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: evt.titre, details: evt.description || '', location: evt.lieu || '',
    dates: `${d}T${t(evt.heureDebut)}/${d}T${t(evt.heureFin || evt.heureDebut)}`, ctz: 'Europe/Paris',
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
