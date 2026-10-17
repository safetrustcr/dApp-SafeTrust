import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

function getFirebaseApp() {
  return getApps()[0] ?? initializeApp();
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseMessaging() {
  return getMessaging(getFirebaseApp());
}
