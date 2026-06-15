/* ════════════════════════════════════════════════════════════════
   DATA + PERSISTENCE LAYER
   Supabase cloud sync · localStorage · IndexedDB · debounced save
   Globals are declared with `var` / function declarations so they are
   reachable from the separate Babel-compiled UI modules.
   ════════════════════════════════════════════════════════════════ */

// Shared namespace for UI modules (components register/consume here)
window.KN = window.KN || {};

// ==================== UTILS ====================
function uid() { return Math.random().toString(36).slice(2,10); }
function fd(d) { return d instanceof Date ? d.toISOString().split('T')[0] : ''; }
function today() { return new Date().toISOString().split('T')[0]; }
function daysUntil(ds) { if (!ds) return null; return Math.round((new Date(ds) - new Date(today())) / 86400000); }
function dispDate(ds) { if (!ds) return ''; const d = new Date(ds); if (isNaN(d)) return String(ds); return d.toLocaleDateString('en-US', { month:'short', day:'numeric' }); }
function isOverdue(t) { return t.status !== 'done' && t.due && daysUntil(t.due) < 0; }
function isDueSoon(t) { if (t.status === 'done' || !t.due) return false; const d = daysUntil(t.due); return d !== null && d >= 0 && d <= 2; }

// React-bridge hooks (set by the App)
function toast(msg) { if (window.__toast) window.__toast(msg); }
function _flashSaveBtn() { if (window.__flashSave) window.__flashSave(); }
function _showError() { toast('Save failed'); }

// ==================== SUPABASE SYNC ====================
const SB_URL = 'https://brysartqcjylgqwmnjkk.supabase.co';
const SB_KEY = 'sb_publishable_C5e5ViwIlW9dV14ZLi4O0A_ipIXhTB5';
const SB_TABLE = 'comm_state';
const SB_ROW = 'main';

var _sb = null;                 // Supabase client
var _cloudUpdatedAt = null;     // last-seen remote updated_at (for change detection)
var _cloudStatus = 'connecting';// connecting | live | offline

function initSupabase() {
  try {
    if (window.supabase && window.supabase.createClient) {
      _sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    } else {
      _cloudStatus = 'offline';
      console.error('[ERROR] Supabase library not loaded');
    }
  } catch (e) { _cloudStatus = 'offline'; console.error('[ERROR] Supabase init failed:', e); }
}

// Read the shared workspace row → { data, updatedAt } | null
async function readDataFromCloud() {
  if (!_sb) return null;
  try {
    const { data, error } = await _sb.from(SB_TABLE).select('data, updated_at').eq('id', SB_ROW).maybeSingle();
    if (error) { console.error('[ERROR] Supabase read:', error.message); _cloudStatus = 'offline'; return null; }
    _cloudStatus = 'live';
    if (!data) return null;
    return { data: data.data || {}, updatedAt: data.updated_at };
  } catch (e) { _cloudStatus = 'offline'; console.error('[ERROR] Supabase read:', e); return null; }
}

// Upsert the current state to the shared workspace row
async function writeDataToCloud() {
  if (!_sb) return;
  try {
    const now = new Date().toISOString();
    const { error } = await _sb.from(SB_TABLE).upsert({ id: SB_ROW, data: S, updated_at: now }, { onConflict: 'id' });
    if (error) { _cloudStatus = 'offline'; console.error('[ERROR] Supabase write:', error.message); toast('Sync failed: ' + error.message); return; }
    _cloudStatus = 'live';
    _cloudUpdatedAt = now;
  } catch (e) { _cloudStatus = 'offline'; console.error('[ERROR] Supabase write:', e); }
}

// ==================== STATE ====================
var S = { revenue: 0, revenueAuto: false, roles: ['CEO','COO','CFO','CMO','CIO'], roleColors: {}, projects: [], archivedProjects: [], tasks: [], payments: [], decisions: [] };

// ==================== PERSIST ====================
const STORE = 'ops_cmd_v3', STORE_META = 'ops_cmd_v3_meta';
const IDB_NAME = 'kneuralabs_cmd', IDB_STORE = 'snapshots', IDB_KEY = 'main';
var _lastSavedAt = null, _idb = null, _saveDebounceTimer = null;

function _openIDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) { resolve(null); return; }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => { e.target.result.createObjectStore(IDB_STORE); };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => resolve(null);
  });
}
function _idbWrite(data) { if (!_idb) return; try { _idb.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(data, IDB_KEY); } catch(e) {} }
function _idbRead() {
  return new Promise(resolve => {
    if (!_idb) { resolve(null); return; }
    try { const req = _idb.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(IDB_KEY); req.onsuccess = () => resolve(req.result || null); req.onerror = () => resolve(null); }
    catch(e) { resolve(null); }
  });
}

function _writeToDisk() {
  const payload = JSON.stringify(S), now = new Date();
  try { localStorage.setItem(STORE, payload); localStorage.setItem(STORE_META, JSON.stringify({ savedAt: now.toISOString() })); }
  catch(e) { _showError(); return; }
  _idbWrite({ data: payload, savedAt: now.toISOString() });
  writeDataToCloud().catch(err => console.error('Cloud sync error:', err));
  _lastSavedAt = now;
  _flashSaveBtn();
}

// Auto-save: persist locally immediately, debounce the cloud push
function save() {
  const payload = JSON.stringify(S), now = new Date();
  try { localStorage.setItem(STORE, payload); localStorage.setItem(STORE_META, JSON.stringify({ savedAt: now.toISOString() })); } catch(e) {}
  _idbWrite({ data: payload, savedAt: now.toISOString() });
  clearTimeout(_saveDebounceTimer);
  _saveDebounceTimer = setTimeout(() => {
    _saveDebounceTimer = null;
    _lastSavedAt = new Date();
    _flashSaveBtn();
    writeDataToCloud().catch(err => console.error('Cloud sync error:', err));
  }, 1500);
}

function manualSave() { clearTimeout(_saveDebounceTimer); _saveDebounceTimer = null; _writeToDisk(); }

// Background sync: pull changes made on other devices
async function _syncFromCloud() {
  if (document.visibilityState !== 'visible') return;
  if (_saveDebounceTimer) return;
  if (!_sb) return;
  try {
    const { data, error } = await _sb.from(SB_TABLE).select('updated_at').eq('id', SB_ROW).maybeSingle();
    if (error || !data) return;
    if (!data.updated_at || data.updated_at === _cloudUpdatedAt) return;
    const remote = await readDataFromCloud();
    if (remote && remote.data && Object.keys(remote.data).length > 0) {
      _cloudUpdatedAt = remote.updatedAt;
      S = { ...S, ...remote.data };
      if (window.__refresh) window.__refresh();
      toast('↓ Synced');
    }
  } catch(e) {}
}

// Load: cloud first (source of truth), falling back to localStorage / IndexedDB
async function load() {
  _idb = await _openIDB();
  let loaded = false;
  try { const d = localStorage.getItem(STORE); if (d) { S = Object.assign({}, S, JSON.parse(d)); loaded = true; } } catch(e) {}
  if (!loaded) {
    const snap = await _idbRead();
    if (snap && snap.data) { try { S = Object.assign({}, S, JSON.parse(snap.data)); loaded = true; } catch(e) {} }
  }
  try { const m = localStorage.getItem(STORE_META); if (m) { const meta = JSON.parse(m); if (meta.savedAt) _lastSavedAt = new Date(meta.savedAt); } } catch(e) {}

  const remote = await readDataFromCloud();
  if (remote) {
    _cloudUpdatedAt = remote.updatedAt;
    const localNewer = _lastSavedAt && remote.updatedAt && new Date(_lastSavedAt) > new Date(remote.updatedAt);
    if (!localNewer && remote.data && Object.keys(remote.data).length > 0) {
      S = Object.assign({}, S, remote.data);
      loaded = true;
    }
  }
}

// ==================== LIVING SURFACE — mood from operational health ====================
// The ambient aurora hue/energy is a direct readout of how healthy the board is:
// calm blue when all is well, warming toward amber and red as risk accumulates.
function computeMood() {
  const tasks = (S.tasks || []);
  const open = tasks.filter(t => t.status !== 'done').length || 1;
  const overdue = tasks.filter(t => isOverdue(t)).length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const overdueP = (S.payments || []).some(p => p.status !== 'received' && p.due && daysUntil(p.due) < 0);
  // risk 0..1
  let risk = Math.min(1, (overdue * 1.4 + blocked * 0.8) / open + (overdueP ? 0.18 : 0));
  // hue: 212 (calm blue) → 8 (alert red) as risk climbs
  const hue = Math.round(212 - risk * 204);
  const sat = Math.round(78 + risk * 14);
  const energy = (0.09 + risk * 0.14).toFixed(3);
  return { hue, sat, energy, risk };
}
function applyMood() {
  try {
    const m = computeMood();
    const r = document.documentElement;
    r.style.setProperty('--mood-h', m.hue);
    r.style.setProperty('--mood-s', m.sat + '%');
    r.style.setProperty('--mood-e', m.energy);
  } catch (e) {}
}
window.KN.applyMood = applyMood;
window.KN.computeMood = computeMood;

initSupabase();
