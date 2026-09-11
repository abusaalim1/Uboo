import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatMessage, UserCustomSettings, DevicePermissionState } from '../types';

const SESSION_USER_ID = 'uboo_user_default';

/**
 * Save chat message to Firestore cloud database
 */
export async function saveMessageToCloud(message: ChatMessage): Promise<void> {
  try {
    const docRef = doc(db, 'conversations', SESSION_USER_ID, 'messages', message.id);
    await setDoc(docRef, {
      ...message,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Firestore cloud sync warning (message):', err);
  }
}

/**
 * Fetch recent cloud conversation history
 */
export async function loadMessagesFromCloud(): Promise<ChatMessage[]> {
  try {
    const q = query(
      collection(db, 'conversations', SESSION_USER_ID, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    const snap = await getDocs(q);
    const msgs: ChatMessage[] = [];
    snap.forEach((d) => {
      msgs.push(d.data() as ChatMessage);
    });
    return msgs;
  } catch (err) {
    console.warn('Firestore load messages error:', err);
    return [];
  }
}

/**
 * Clear cloud message history
 */
export async function clearMessagesInCloud(): Promise<void> {
  try {
    const q = query(collection(db, 'conversations', SESSION_USER_ID, 'messages'));
    const snap = await getDocs(q);
    const promises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(promises);
  } catch (err) {
    console.warn('Firestore clear error:', err);
  }
}

/**
 * Save user custom settings (AI Name, Wake Words, Voice, etc.)
 */
export async function saveSettingsToCloud(settings: Partial<UserCustomSettings>): Promise<void> {
  try {
    const docRef = doc(db, 'users', SESSION_USER_ID, 'settings', 'preferences');
    await setDoc(docRef, settings, { merge: true });
  } catch (err) {
    console.warn('Firestore settings sync warning:', err);
  }
}

/**
 * Save permissions state to cloud
 */
export async function savePermissionsToCloud(permissions: DevicePermissionState): Promise<void> {
  try {
    const docRef = doc(db, 'users', SESSION_USER_ID, 'settings', 'permissions');
    await setDoc(docRef, permissions, { merge: true });
  } catch (err) {
    console.warn('Firestore permissions sync warning:', err);
  }
}
