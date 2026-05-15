importScripts(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"
);

importScripts(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
    apiKey: "AIzaSyCp5KqFQUDVN2yHvNdEDbS08i3oj0m7NIU",
    authDomain: "nolist-2a3d4.firebaseapp.com",
    projectId: "nolist-2a3d4",
    storageBucket: "nolist-2a3d4.firebasestorage.app",
    messagingSenderId: "601771236222",
    appId: "1:601771236222:web:8dfbb82d6553708758312f",
});

const messaging =
    firebase.messaging();

messaging.onBackgroundMessage(
    (payload) => {

        self.registration.showNotification(
            payload.notification.title,
            {
                body:
                    payload.notification.body,
                icon: "/icon.png",
            }
        );

    }
);