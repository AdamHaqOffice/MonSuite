import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase.js';

const ADMIN_MODE_KEY = 'monsuite-admin-mode-enabled';
const ADMIN_NEWS_KEY = 'monsuite-admin-news-posts';
const ADMIN_DOWNLOADS_KEY = 'monsuite-admin-downloads';
const ADMIN_FIRMWARE_KEY = 'monsuite-admin-firmware-history';

const DEFAULT_ADMIN_EMAILS = ['adamhaqoffice@gmail.com'];

export const adminBackendReady = Boolean(db);

const collectionNames = {
  news: 'monsuiteNews',
  downloads: 'monsuiteDownloads',
  firmwareHistory: 'monsuiteFirmwareHistory',
};

function safeStorage() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

function readJson(key, fallback) {
  const storage = safeStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('monsuite-admin-content-updated', { detail: { key } }));
}

function localKeyFor(type) {
  if (type === 'news') return ADMIN_NEWS_KEY;
  if (type === 'downloads') return ADMIN_DOWNLOADS_KEY;
  return ADMIN_FIRMWARE_KEY;
}

function collectionFor(type) {
  return collectionNames[type] || collectionNames.news;
}

function dateForSort(item) {
  return item.date || item.releaseDate || item.updated || item.createdAtLocal || '';
}

function sortContent(items) {
  return [...items].sort((a, b) => String(dateForSort(b)).localeCompare(String(dateForSort(a))));
}

function normalizeFirestoreDoc(snapshot) {
  const data = snapshot.data() || {};
  return {
    ...data,
    id: snapshot.id,
    published: data.published !== false,
    storageSource: 'Firestore',
  };
}

function localRead(type) {
  return sortContent(readJson(localKeyFor(type), []));
}

function localWrite(type, items) {
  writeJson(localKeyFor(type), sortContent(items));
}

function localAdd(type, item) {
  const items = localRead(type);
  const next = [{ ...item, id: item.id || `local-${type}-${Date.now()}`, storageSource: 'Local staging' }, ...items];
  localWrite(type, next);
  return next;
}

function localUpdate(type, id, patch) {
  const next = localRead(type).map((item) => (item.id === id ? { ...item, ...patch } : item));
  localWrite(type, next);
  return next;
}

function localDelete(type, id) {
  const next = localRead(type).filter((item) => item.id !== id);
  localWrite(type, next);
  return next;
}

export function getConfiguredAdminEmails() {
  const env = import.meta.env || {};
  const envEmails = env.VITE_ADMIN_EMAILS
    ?.split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return envEmails?.length ? envEmails : DEFAULT_ADMIN_EMAILS;
}

export function userCanUseAdminMode(user) {
  const email = user?.email?.toLowerCase() || '';
  return getConfiguredAdminEmails().includes(email);
}

export function getAdminModeEnabled() {
  const storage = safeStorage();
  return storage?.getItem(ADMIN_MODE_KEY) === 'true';
}

export function setAdminModeEnabled(enabled) {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(ADMIN_MODE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('monsuite-admin-mode-updated', { detail: { enabled } }));
}

export function subscribeAdminContent(type, callback) {
  if (!adminBackendReady) {
    callback(localRead(type), { source: 'Local staging', backendReady: false });
    const listener = () => callback(localRead(type), { source: 'Local staging', backendReady: false });
    window.addEventListener('monsuite-admin-content-updated', listener);
    return () => window.removeEventListener('monsuite-admin-content-updated', listener);
  }

  const q = query(collection(db, collectionFor(type)), orderBy('sortDate', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(normalizeFirestoreDoc), { source: 'Firestore', backendReady: true });
  }, (error) => {
    console.warn(`MonSuite admin ${type} subscription fell back to local staging:`, error);
    callback(localRead(type), { source: 'Local staging fallback', backendReady: false, error });
  });
}

async function addItem(type, item) {
  const payload = {
    ...item,
    published: item.published !== false,
    sortDate: item.date || item.releaseDate || item.updated || new Date().toISOString().slice(0, 10),
    createdAtLocal: new Date().toISOString(),
  };

  if (!adminBackendReady) return localAdd(type, payload);

  const docRef = await addDoc(collection(db, collectionFor(type)), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { ...payload, id: docRef.id, storageSource: 'Firestore' };
}

export async function updateAdminContentItem(type, id, patch) {
  if (!id) return null;
  if (!adminBackendReady || id.startsWith('local-') || id.startsWith('admin-')) {
    return localUpdate(type, id, patch);
  }
  const updatePayload = { ...patch, updatedAt: serverTimestamp() };
  const sortDate = patch.date || patch.releaseDate || patch.updated || patch.sortDate;
  if (sortDate) updatePayload.sortDate = sortDate;
  await updateDoc(doc(db, collectionFor(type), id), updatePayload);
  return true;
}

export async function deleteAdminContentItem(type, id) {
  if (!id) return null;
  if (!adminBackendReady || id.startsWith('local-') || id.startsWith('admin-')) return localDelete(type, id);
  await deleteDoc(doc(db, collectionFor(type), id));
  return true;
}

export function getAdminNewsPosts() {
  return localRead('news');
}

export function saveAdminNewsPosts(posts) {
  localWrite('news', posts);
}

export function addAdminNewsPost(post) {
  return addItem('news', post);
}

export function getAdminDownloads() {
  return localRead('downloads');
}

export function saveAdminDownloads(downloads) {
  localWrite('downloads', downloads);
}

export function addAdminDownload(download) {
  return addItem('downloads', download);
}

export function getAdminFirmwareHistory() {
  return localRead('firmwareHistory');
}

export function saveAdminFirmwareHistory(history) {
  localWrite('firmwareHistory', history);
}

export function addAdminFirmwareHistory(release) {
  return addItem('firmwareHistory', release);
}

export function getAdminContentSnapshot() {
  return {
    news: getAdminNewsPosts(),
    downloads: getAdminDownloads(),
    firmwareHistory: getAdminFirmwareHistory(),
  };
}

export function clearAdminContent() {
  saveAdminNewsPosts([]);
  saveAdminDownloads([]);
  saveAdminFirmwareHistory([]);
}
