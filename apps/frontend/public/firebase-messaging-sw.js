/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Only public web config is passed via the registration URL query string.
const params = new URL(self.location).searchParams;

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

// Notification payloads (title/body + webpush.fcmOptions.link) are displayed
// and click-routed by the FCM SDK itself — no custom handlers needed.
firebase.messaging();

// No custom notificationclick handler: the FCM SDK routes clicks via webpush.fcmOptions.link.