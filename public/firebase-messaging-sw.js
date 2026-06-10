importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  "projectId": "smart-push-59a34",
  "appId": "1:613399334374:web:4f2ab4d9d0a042767eda27",
  "apiKey": "AIzaSyAi_hsw2W-_u3KZEIYrQGkFlL_fCxIrhH4",
  "authDomain": "smart-push-59a34.firebaseapp.com",
  "storageBucket": "smart-push-59a34.appspot.com",
  "messagingSenderId": "613399334374",
  "measurementId": "G-DMGWPSQRB7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Smart ADS';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
