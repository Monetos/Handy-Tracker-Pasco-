'use strict';
// Einzugsbuch, Buchseiten-Scan, Navigation und Update-Funktion.
// Nutzt $, fmt, store, cfg, saveCfg, banner aus index.html.

// ---------- Navigation ----------
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.hidden = t.id !== 'tab-' + name);
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  if (name === 'buch') renderBook();
  if (name === 'einzug') initForm(false);
  scrollTo(0, 0);
}
document.querySelectorAll('#nav button').forEach(b => b.onclick = () => showTab(b.dataset.tab));

// ---------- Datenbank (IndexedDB, nur auf diesem Gerät) ----------
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('handy-tracker', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('entries', { keyPath: 'id' }); r.result.createObjectStore('photos', { keyPath: 'id' }); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(storeName, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(storeName, mode), rq = fn(t.objectStore(storeName));
      t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error);
    });
  },
  all: s => DB.tx(s, 'readonly', o => o.getAll()),
  get: (s, k) => DB.tx(s, 'readonly', o => o.get(k)),
  put: (s, v) => DB.tx(s, 'readwrite', o => o.put(v)),
  del: (s, k) => DB.tx(s, 'readwrite', o => o.delete(k))
};
let entries = [];   // {id, name, klasse, t, by, note, photos:[id], picked:{t, who}|null, src}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------- Regeln ----------
const schoolYear = t => { const d = new Date(t), y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; return y; };   // Schuljahr beginnt am 1. August
const syLabel = y => `${y}/${String(y + 1).slice(2)}`;
const normName = n => { n = n.trim().replace(/\s+/g, ' '); if (n.includes(',')) { const [a, b] = n.split(','); n = (b.trim() + ' ' + a.trim()).trim(); } return n; };
const keyOf = (name, klasse) => normName(name).toLowerCase() + '|' + klasse.replace(/\s+/g, '').toLowerCase();
function rule(n) {
  return n <= 1
    ? { cls: 'r1', title: '1. Einzug – Verwarnung', text: 'Verwahrung im Lehrerzimmer. Abholung nach Unterrichtsschluss durch die Schülerin bzw. den Schüler.', short: '1× · Verwarnung' }
    : { cls: 'r2', title: `${n}. Einzug – Abholung nur durch Eltern`, text: 'Verwahrung im Lehrerzimmer. Herausgabe ausschließlich an die Eltern.', short: `${n}× · Eltern` };
}
const forStudent = (key, year) => entries.filter(e => keyOf(e.name, e.klasse) === key && schoolYear(e.t) === year).sort((a, b) => a.t - b.t);
const dt = t => new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };

// ---------- Fotos ----------
async function shrink(file, max = 1600, q = 0.8) {
  const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = el('canvas', { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, 'image/jpeg', q));
}
const toDataUrl = blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });

// ---------- Formular „Einziehen“ ----------
let formPhotos = [];
const localIso = t => { const d = new Date(t - new Date(t).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
function initForm(reset) {
  if (reset) { $('eName').value = $('eKlasse').value = $('eNote').value = ''; formPhotos = []; renderFormPhotos(); }
  if (reset || !$('eTime').value) $('eTime').value = localIso(Date.now());
  if (!$('eBy').value) $('eBy').value = cfg.teacher || '';
  const names = new Map(entries.map(e => [keyOf(e.name, e.klasse), e]));
  $('dlNames').replaceChildren(...[...names.values()].map(e => el('option', { value: e.name, label: e.klasse })));
  showRule();
}
function showRule() {
  const name = $('eName').value.trim(), box = $('eRule');
  if (name.length < 2) { box.hidden = true; return; }
  const t = $('eTime').value ? new Date($('eTime').value).getTime() : Date.now();
  const prev = forStudent(keyOf(name, $('eKlasse').value), schoolYear(t)), r = rule(prev.length + 1);
  box.hidden = false; box.className = 'rule ' + r.cls;
  box.replaceChildren(el('b', { textContent: r.title }), r.text + (prev.length ? ` Bisher im Schuljahr ${syLabel(schoolYear(t))}: ${prev.map(e => new Date(e.t).toLocaleDateString('de-DE')).join(', ')}.` : ''));
}
function renderFormPhotos() {
  $('ePhotos').replaceChildren(...formPhotos.map((b, i) => el('img', { src: URL.createObjectURL(b), alt: 'Foto ' + (i + 1), onclick() { if (confirm('Foto entfernen?')) { formPhotos.splice(i, 1); renderFormPhotos(); } } })));
}
$('eName').addEventListener('input', () => {
  const hit = entries.find(e => e.name.toLowerCase() === $('eName').value.trim().toLowerCase());
  if (hit && !$('eKlasse').value) $('eKlasse').value = hit.klasse;
  showRule();
});
['eKlasse', 'eTime'].forEach(id => $(id).addEventListener('input', showRule));
$('ePhotoBtn').onclick = () => $('ePhotoIn').click();
$('ePhotoIn').onchange = async e => { for (const f of e.target.files) formPhotos.push(await shrink(f)); e.target.value = ''; renderFormPhotos(); };
$('eSave').onclick = async () => {
  const name = normName($('eName').value), klasse = $('eKlasse').value.trim();
  if (name.length < 2) { alert('Bitte den Namen eintragen.'); $('eName').focus(); return; }
  const t = $('eTime').value ? new Date($('eTime').value).getTime() : Date.now();
  const entry = { id: uid(), name, klasse, t, by: $('eBy').value.trim(), note: $('eNote').value.trim(), photos: [], picked: null, src: 'app' };
  for (const blob of formPhotos) { const id = uid(); await DB.put('photos', { id, blob }); entry.photos.push(id); }
  await DB.put('entries', entry); entries.push(entry);
  cfg.teacher = entry.by; saveCfg();
  const r = rule(forStudent(keyOf(name, klasse), schoolYear(t)).length);
  initForm(true);
  alert(`Gespeichert.\n\n${name}${klasse ? ' (' + klasse + ')' : ''}\n${r.title}\n${r.text}`);
};

// ---------- Buch ----------
let bookYear = schoolYear(Date.now());
function renderBook() {
  const years = [...new Set([schoolYear(Date.now()), ...entries.map(e => schoolYear(e.t))])].sort((a, b) => b - a);
  if (!years.includes(bookYear)) bookYear = years[0];
  $('bYear').replaceChildren(...years.map(y => el('option', { value: y, textContent: 'SJ ' + syLabel(y), selected: y === bookYear })));
  const q = $('bSearch').value.trim().toLowerCase(), inYear = entries.filter(e => schoolYear(e.t) === bookYear), groups = new Map();
  for (const e of inYear) { const k = keyOf(e.name, e.klasse); (groups.get(k) || groups.set(k, []).get(k)).push(e); }
  $('bTotal').textContent = inYear.length; $('bStud').textContent = groups.size; $('bOpen').textContent = inYear.filter(e => !e.picked).length;
  const rows = [...groups.entries()].map(([k, list]) => ({ k, list, last: Math.max(...list.map(e => e.t)) }))
    .filter(g => !q || (g.list[0].name + ' ' + g.list[0].klasse).toLowerCase().includes(q))
    .sort((a, b) => b.list.length - a.list.length || b.last - a.last);
  $('noStud').hidden = rows.length > 0;
  $('students').replaceChildren(...rows.map(g => {
    const r = rule(g.list.length), open = g.list.some(e => !e.picked);
    return el('li', { onclick: () => openStudent(g.k) },
      el('div', { className: 'who' }, el('b', { textContent: g.list[0].name }), el('small', { textContent: `${g.list[0].klasse || 'ohne Klasse'} · zuletzt ${new Date(g.last).toLocaleDateString('de-DE')}${open ? ' · verwahrt' : ''}` })),
      el('span', { className: 'badge ' + r.cls, textContent: r.short }));
  }));
}
$('bYear').onchange = e => { bookYear = +e.target.value; renderBook(); };
$('bSearch').oninput = renderBook;

function openSheet(title) { $('sheetTitle').textContent = title; $('sheetBody').replaceChildren(); $('sheet').hidden = false; return $('sheetBody'); }
$('sheetClose').onclick = () => { $('sheet').hidden = true; renderBook(); };

async function openStudent(key) {
  const list = forStudent(key, bookYear);
  if (!list.length) { $('sheet').hidden = true; renderBook(); return; }
  const body = openSheet(`${list[0].name}${list[0].klasse ? ' · ' + list[0].klasse : ''}`), r = rule(list.length);
  body.append(el('div', { className: 'rule ' + r.cls }, el('b', { textContent: `Stand SJ ${syLabel(bookYear)}: ${list.length} Einzug${list.length > 1 ? 'e' : ''}` }), 'Beim nächsten Mal: ' + rule(list.length + 1).text));
  for (const [i, e] of list.entries()) {
    const ri = rule(i + 1), card = el('div', { className: 'card' });
    card.append(el('div', { className: 't' }, el('span', { textContent: `${i + 1}. Einzug · ${dt(e.t)}` }), el('span', { className: 'badge ' + (e.picked ? 'ok' : ri.cls), textContent: e.picked ? 'abgeholt' : 'verwahrt' })));
    card.append(el('div', { textContent: `Eingezogen von: ${e.by || '–'}${e.src === 'buch' ? ' · aus dem Buch übernommen' : ''}` }));
    if (e.note) card.append(el('div', { textContent: 'Notiz: ' + e.note }));
    card.append(el('div', { textContent: e.picked ? `Abgeholt am ${dt(e.picked.t)} durch ${e.picked.who}` : 'Abholung: ' + (i ? 'nur durch Eltern' : 'nach Unterrichtsschluss durch Schüler/in') }));
    if (e.photos.length) {
      const ph = el('div', { className: 'photos' }); card.append(ph);
      for (const id of e.photos) { const p = await DB.get('photos', id); if (p) { const url = URL.createObjectURL(p.blob); ph.append(el('img', { src: url, alt: 'Foto des Geräts', onclick: () => open(url) })); } }
    }
    const acts = el('div', { className: 'acts' });
    acts.append(el('button', { className: 'link', textContent: e.picked ? 'Abholung zurücknehmen' : 'Als abgeholt markieren', async onclick() {
      if (e.picked) e.picked = null;
      else { const who = prompt('Abgeholt durch:', i ? 'Eltern' : 'Schüler/in'); if (who == null) return; e.picked = { t: Date.now(), who: who.trim() || '–' }; }
      await DB.put('entries', e); openStudent(key);
    } }));
    acts.append(el('button', { className: 'link', textContent: 'Notiz ändern', async onclick() { const v = prompt('Notiz:', e.note); if (v == null) return; e.note = v.trim(); await DB.put('entries', e); openStudent(key); } }));
    acts.append(el('button', { className: 'link', textContent: 'Löschen', style: 'color:var(--hot)', async onclick() {
      if (!confirm('Diesen Eintrag endgültig löschen?')) return;
      for (const id of e.photos) await DB.del('photos', id);
      await DB.del('entries', e.id); entries = entries.filter(x => x.id !== e.id); openStudent(key);
    } }));
    card.append(acts); body.append(card);
  }
}

// ---------- Export / Backup ----------
function download(name, blob) { const a = el('a', { href: URL.createObjectURL(blob), download: name }); a.click(); }
const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
$('bCsv').onclick = () => {
  const rows = [['Schuljahr', 'Name', 'Klasse', 'Datum', 'Nr. im SJ', 'Eingezogen von', 'Notiz', 'Abgeholt am', 'Abgeholt durch'].join(';')];
  for (const e of [...entries].sort((a, b) => a.t - b.t)) {
    const nr = forStudent(keyOf(e.name, e.klasse), schoolYear(e.t)).findIndex(x => x.id === e.id) + 1;
    rows.push([syLabel(schoolYear(e.t)), e.name, e.klasse, dt(e.t), nr, e.by, e.note, e.picked ? dt(e.picked.t) : '', e.picked ? e.picked.who : ''].map(csvCell).join(';'));
  }
  download('einzugsbuch.csv', new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv' }));
};
$('bBackup').onclick = async () => {
  const photos = {}; for (const p of await DB.all('photos')) photos[p.id] = await toDataUrl(p.blob);
  download(`handy-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify({ app: 'handy-tracker', v: 1, entries, photos })], { type: 'application/json' }));
};
$('bRestore').onclick = () => $('bRestoreIn').click();
$('bRestoreIn').onchange = async ev => {
  const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (data.app !== 'handy-tracker' || !Array.isArray(data.entries)) throw new Error('Das ist kein Handy-Tracker-Backup.');
    const have = new Set(entries.map(e => e.id)); let added = 0;
    for (const e of data.entries) if (!have.has(e.id)) { await DB.put('entries', e); entries.push(e); added++; }
    for (const [id, url] of Object.entries(data.photos || {})) await DB.put('photos', { id, blob: await (await fetch(url)).blob() });
    alert(`${added} neue Einträge übernommen (${data.entries.length - added} waren schon vorhanden).`); renderBook();
  } catch (e) { alert('Backup konnte nicht geladen werden: ' + e.message); }
};

// ---------- Buchseite scannen ----------
const SCAN_SCHEMA = { type: 'object', additionalProperties: false, required: ['rows'], properties: { rows: { type: 'array', items: {
  type: 'object', additionalProperties: false, required: ['name', 'klasse', 'datum', 'lehrkraft', 'unsicher'],
  properties: { name: { type: 'string' }, klasse: { type: 'string' }, datum: { type: 'string' }, lehrkraft: { type: 'string' }, unsicher: { type: 'boolean' } } } } } };

async function recognizeAI(blob) {
  if (!cfg.apiKey) throw new Error('Für die KI-Erkennung fehlt der API-Schlüssel (Mehr → Buch-Scan: Texterkennung).');
  const b64 = (await toDataUrl(blob)).split(',')[1];
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2026-10-21',
      'anthropic-beta': 'server-side-fallback-2026-07-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({
      model: 'claude-opus-5-5', max_tokens: 16000, fallbacks: 'default',
      output_config: { effort: 'high', format: { type: 'json_schema', schema: SCAN_SCHEMA } },
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
        { type: 'text', text: `Das Foto zeigt eine Seite aus dem Buch einer Schule, in dem eingetragen wird, wann welcher Schülerin oder welchem Schüler das Handy abgenommen wurde. Die Einträge sind meist handschriftlich.

Lies die Seite und gib jeden einzelnen Einzug als eigene Zeile zurück. Stehen bei einem Namen mehrere Daten, ist jedes Datum ein eigener Einzug mit demselben Namen und derselben Klasse.

- name: so, wie er dasteht, in der Form "Vorname Nachname".
- klasse: z. B. "8b" oder "11"; leer, wenn nicht angegeben.
- datum: im Format JJJJ-MM-TT. Fehlt das Jahr, gilt das Schuljahr ${syLabel(bookYear)} (August bis Dezember ${bookYear}, Januar bis Juli ${bookYear + 1}). Leer, wenn kein Datum erkennbar ist.
- lehrkraft: Name oder Kürzel der Lehrkraft, falls eingetragen, sonst leer.
- unsicher: true, wenn du bei Name oder Datum raten musstest.

Die Zeilen werden anschließend von einer Lehrkraft gegen das Foto geprüft. Gib deshalb lieber eine unsichere Lesung mit unsicher=true zurück, als eine Zeile wegzulassen. Überschriften, Unterschriften und leere Zeilen gehören nicht in die Liste.` }] }]
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(res.status === 401 ? 'Der API-Schlüssel wurde abgelehnt.' : `KI-Dienst meldet Fehler ${res.status}: ${data.error?.message || 'unbekannt'}`);
  if (data.stop_reason === 'refusal') throw new Error('Die KI hat die Auswertung dieses Bildes abgelehnt.');
  if (data.stop_reason === 'max_tokens') throw new Error('Die Seite enthält zu viele Einträge für einen Durchgang. Bitte in zwei Hälften fotografieren.');
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(text).rows.map(r => ({ name: r.name, klasse: r.klasse, datum: r.datum, by: r.lehrkraft, unsure: r.unsicher }));
}

function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = el('script', { src, onload: res, onerror: () => rej(new Error('Texterkennung konnte nicht geladen werden (beim ersten Mal ist Internet nötig).')) }); document.head.append(s); }); }
async function recognizeLocal(blob, onProgress) {
  await loadScript('vendor/tesseract/tesseract.min.js');
  const base = new URL('vendor/tesseract/', location.href).href;
  const worker = await Tesseract.createWorker('deu', 1, { workerPath: base + 'worker.min.js', corePath: base, langPath: base + 'lang',
    logger: m => { if (m.status === 'recognizing text') onProgress(m.progress); } });
  try { const { data } = await worker.recognize(blob); return parseOcrText(data.text); } finally { await worker.terminate(); }
}
// Zerlegt erkannte Textzeilen in Name / Klasse / Datum. Mehrere Daten in einer Zeile ergeben mehrere Einträge.
function parseOcrText(text) {
  const rows = [];
  for (let line of text.split('\n')) {
    line = line.replace(/[|_\[\]{}]/g, ' ').trim();
    if (line.length < 4 || /\b(name|klasse|datum|unterschrift|lehrer)\b/i.test(line)) continue;
    const dates = [];
    line = line.replace(/\b(\d{1,2})\s?[.,\/]\s?(\d{1,2})\s?[.,\/]?\s?(\d{4}|\d{2})?\b/g, (m, d, mo, y) => {
      d = +d; mo = +mo; if (d < 1 || d > 31 || mo < 1 || mo > 12) return m;
      y = y ? (y.length === 2 ? 2000 + +y : +y) : (mo >= 8 ? bookYear : bookYear + 1);
      dates.push(`${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`); return ' § ';
    });
    let klasse = '';
    line = line.replace(/\b((?:1[0-3]|[5-9])\s?[a-fA-F]?(?:\/\d)?)\b/, (m, k) => { klasse = k.replace(/\s/g, '').toLowerCase(); return ' § '; });
    const parts = line.split('§').map(s => s.replace(/[^\p{L}\s,.\-']/gu, ' ').replace(/\s+/g, ' ').trim());
    const name = normName(parts[0] || '');
    if (name.replace(/[^\p{L}]/gu, '').length < 3) continue;
    const by = parts.slice(1).find(p => p.length >= 2) || '';
    for (const datum of dates.length ? dates : ['']) rows.push({ name, klasse, datum, by, unsure: !datum });
  }
  return rows;
}

$('scanBtn').onclick = () => {
  const body = openSheet('Buchseite scannen');
  const fileIn = el('input', { type: 'file', accept: 'image/*', hidden: true }), camIn = el('input', { type: 'file', accept: 'image/*', hidden: true });
  camIn.setAttribute('capture', 'environment');
  const ai = cfg.ocrMode === 'ai';
  body.append(el('p', { className: 'hint', textContent: `Seite gerade, formatfüllend und bei gutem Licht fotografieren. Die erkannten Zeilen kannst du vor dem Übernehmen gegen das Foto prüfen und korrigieren. Erkennung: ${ai ? 'KI (auch Handschrift) – das Foto wird an Anthropic gesendet' : 'auf dem Gerät (nur Druckschrift)'}. Umstellen unter „Mehr“.` }),
    el('div', { className: 'row' }, el('button', { className: 'big primary', textContent: '📷 Seite fotografieren', onclick: () => camIn.click() }), el('button', { className: 'big', textContent: 'Bild wählen', onclick: () => fileIn.click() })),
    fileIn, camIn, el('div', { id: 'scanOut' }));
  fileIn.onchange = camIn.onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) runScan(f); };
};

async function runScan(file) {
  const out = $('scanOut'), bar = el('progress', { max: 1 }), msg = el('p', { className: 'hint', textContent: 'Seite wird gelesen …' });
  const blob = await shrink(file, 2200, 0.85);
  out.replaceChildren(el('img', { className: 'page', src: URL.createObjectURL(blob), alt: 'Fotografierte Buchseite' }), bar, msg);
  let rows;
  try { rows = cfg.ocrMode === 'ai' ? await recognizeAI(blob) : await recognizeLocal(blob, p => bar.value = p); }
  catch (e) { bar.remove(); msg.textContent = 'Erkennung fehlgeschlagen: ' + e.message + ' Du kannst die Zeilen unten von Hand eintragen.'; rows = []; }
  bar.remove();
  if (rows.length) msg.textContent = `${rows.length} Zeilen erkannt. Bitte gegen das Foto prüfen – gelb markierte Zeilen sind unsicher.`;
  else if (!msg.textContent.startsWith('Erkennung fehl')) msg.textContent = 'Keine Einträge erkannt (Handschrift braucht die KI-Erkennung). Du kannst die Zeilen unten von Hand eintragen.';
  const list = el('div'), addRow = (r = { name: '', klasse: '', datum: '', by: '', unsure: false }) => {
    const row = el('div', { className: 'srow' });
    row.append(el('input', { type: 'text', className: 'n', placeholder: 'Name', value: r.name, style: r.unsure ? 'border-color:var(--warn)' : '' }),
      el('input', { type: 'text', className: 'k', placeholder: 'Kl.', value: r.klasse }),
      el('button', { textContent: '✕', title: 'Zeile entfernen', onclick: () => row.remove() }),
      el('input', { type: 'date', className: 'd', value: r.datum, style: r.datum ? '' : 'border-color:var(--warn)' }),
      el('input', { type: 'text', className: 'b', placeholder: 'Lehrkraft', value: r.by }));
    list.append(row);
  };
  rows.forEach(addRow); if (!rows.length) addRow();
  out.append(list, el('div', { className: 'row' }, el('button', { className: 'big', textContent: '+ Zeile', onclick: () => addRow() }),
    el('button', { className: 'big primary', textContent: 'Übernehmen', async onclick() {
      const items = [...list.children].map(r => ({ name: normName(r.querySelector('.n').value), klasse: r.querySelector('.k').value.trim(), datum: r.querySelector('.d').value, by: r.querySelector('.b').value.trim() })).filter(r => r.name.length >= 2);
      if (!items.length) { alert('Keine Zeilen mit Namen vorhanden.'); return; }
      const noDate = items.filter(r => !r.datum).length;
      if (noDate && !confirm(`${noDate} Zeile(n) haben kein Datum und bekommen das heutige. Trotzdem übernehmen?`)) return;
      let dup = 0;
      for (const r of items) {
        const t = r.datum ? new Date(r.datum + 'T12:00').getTime() : Date.now(), k = keyOf(r.name, r.klasse);
        if (entries.some(e => keyOf(e.name, e.klasse) === k && new Date(e.t).toDateString() === new Date(t).toDateString())) { dup++; continue; }
        const e = { id: uid(), name: r.name, klasse: r.klasse, t, by: r.by, note: r.datum ? '' : 'Datum im Buch nicht lesbar', photos: [], picked: { t, who: 'laut Buch' }, src: 'buch' };
        await DB.put('entries', e); entries.push(e);
      }
      alert(`${items.length - dup} Einträge übernommen${dup ? `, ${dup} doppelte übersprungen` : ''}.`);
      $('sheet').hidden = true; renderBook();
    } })));
}

// ---------- Einstellungen Buch-Scan ----------
$('ocrMode').value = cfg.ocrMode || 'local';
$('ocrMode').onchange = e => { cfg.ocrMode = e.target.value; saveCfg(); };
$('apiKey').value = cfg.apiKey || '';
$('apiKey').onchange = e => { cfg.apiKey = e.target.value.trim(); saveCfg(); };

// ---------- Update ----------
$('verNow').textContent = APP_VERSION;
$('changelog').textContent = APP_CHANGES.join('\n'); $('changelog').hidden = false;
async function checkUpdate(manual) {
  try {
    const txt = await (await fetch('version.js?t=' + Date.now(), { cache: 'no-store' })).text();
    const latest = (txt.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1];
    if (latest && latest !== APP_VERSION) {
      $('verNew').textContent = ` · verfügbar: ${latest}`;
      const box = $('update'); box.style.display = 'block';
      box.replaceChildren(`Neue Version ${latest} verfügbar.`, el('button', { textContent: 'Jetzt aktualisieren', onclick: applyUpdate }));
    } else if (manual) alert('Die App ist aktuell (Version ' + APP_VERSION + ').');
  } catch { if (manual) alert('Keine Verbindung – Update-Prüfung nicht möglich.'); }
}
async function applyUpdate() {
  try {
    if (window.caches) for (const k of await caches.keys()) if (k.startsWith('handy-tracker')) await caches.delete(k);
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) await reg.update();
  } catch {}
  location.reload();
}
$('updCheck').onclick = () => checkUpdate(true);

// ---------- Start ----------
DB.open().then(async () => { entries = await DB.all('entries'); initForm(true); renderBook(); })
  .catch(e => banner('Der Gerätespeicher für das Einzugsbuch ist nicht verfügbar: ' + (e && e.message)));
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();   // schützt die Daten vor automatischem Löschen
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
checkUpdate(false);
