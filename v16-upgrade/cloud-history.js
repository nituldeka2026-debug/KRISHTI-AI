/*
 * KRISHTI AI V16 — Cloud Chat History
 * Requires Firebase v9+ modular SDK and an authenticated user.
 *
 * Usage:
 *   import { saveChat, listChats, loadChat, deleteChat } from "./v16-upgrade/cloud-history.js";
 *
 * IMPORTANT:
 * Firestore rules must enforce that users can only access their own /users/{uid}/chats/{chatId}.
 */

import {
  getFirestore, collection, doc, setDoc, getDocs, getDoc,
  deleteDoc, query, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in first.");
  return user;
}

function chatsRef(uid) {
  return collection(db, "users", uid, "chats");
}

export async function saveChat(chatId, title, messages) {
  const user = requireUser();
  if (!chatId) throw new Error("chatId is required.");

  await setDoc(doc(chatsRef(user.uid), chatId), {
    title: String(title || "New Chat").slice(0, 120),
    messages: Array.isArray(messages) ? messages : [],
    updatedAt: serverTimestamp(),
    ownerUid: user.uid
  }, { merge: true });

  return chatId;
}

export async function listChats(max = 50) {
  const user = requireUser();
  const q = query(chatsRef(user.uid), orderBy("updatedAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function loadChat(chatId) {
  const user = requireUser();
  const snap = await getDoc(doc(chatsRef(user.uid), chatId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function deleteChat(chatId) {
  const user = requireUser();
  await deleteDoc(doc(chatsRef(user.uid), chatId));
}
