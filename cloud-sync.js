/* KRISHTI AI V16.5 — Firestore cloud sync for chats, memory and backups. */
(function () {
  const COLLECTION = 'chats';
  const MEMORY = 'memory';
  const BACKUPS = 'backups';
  let db = null;

  function ready() {
    try {
      if (!window.firebase || !firebase.apps.length || !firebase.auth) return false;
      if (!db && firebase.firestore) db = firebase.firestore();
      return !!db;
    } catch (_) { return false; }
  }
  function uid() { return firebase?.auth?.().currentUser?.uid || null; }
  function userRef() { const id = uid(); return id && ready() ? db.collection('users').doc(id) : null; }
  async function withUser(fn) { const ref = userRef(); if (!ref) return null; return fn(ref); }

  async function listChats() {
    return withUser(async ref => {
      const snap = await ref.collection(COLLECTION).orderBy('updatedAt', 'desc').limit(100).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
  }
  async function saveChat(chat) {
    return withUser(async ref => {
      const data = {
        title: String(chat.title || 'New Chat').slice(0, 120),
        createdAt: Number(chat.createdAt || Date.now()),
        updatedAt: Number(chat.updatedAt || Date.now()),
        messages: Array.isArray(chat.messages) ? chat.messages.slice(-100).map(m => ({ sender: String(m.sender || 'ai'), text: String(m.text || '').slice(0, 20000) })) : []
      };
      await ref.collection(COLLECTION).doc(String(chat.id)).set(data, { merge: true });
      return true;
    });
  }
  async function deleteChat(id) { return withUser(async ref => { await ref.collection(COLLECTION).doc(String(id)).delete(); return true; }); }

  async function listMemory() {
    return withUser(async ref => {
      const snap = await ref.collection(MEMORY).orderBy('time', 'desc').limit(100).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
  }
  async function saveMemory(item) {
    return withUser(async ref => {
      const id = String(item.id || crypto.randomUUID());
      await ref.collection(MEMORY).doc(id).set({ text: String(item.text || '').slice(0, 500), time: Number(item.time || Date.now()) });
      return true;
    });
  }
  async function clearMemory() { return withUser(async ref => { const snap = await ref.collection(MEMORY).get(); const batch = db.batch(); snap.docs.forEach(d => batch.delete(d.ref)); await batch.commit(); return true; }); }

  async function createBackup(payload) {
    return withUser(async ref => {
      const clean = JSON.stringify(payload || {});
      // Keep Firestore backup documents below its 1 MiB document limit.
      if (clean.length > 700000) throw new Error('Backup is too large for one cloud snapshot. Use Export backup for a complete local file.');
      await ref.collection(BACKUPS).doc('latest').set({ ...payload, savedAt: Date.now() });
      return true;
    });
  }
  async function getBackup() { return withUser(async ref => { const d = await ref.collection(BACKUPS).doc('latest').get(); return d.exists ? d.data() : null; }); }

  window.KrishtiCloud = { ready, uid, listChats, saveChat, deleteChat, listMemory, saveMemory, clearMemory, createBackup, getBackup };
})();
