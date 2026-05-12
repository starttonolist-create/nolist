import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyCp5KqFQUDVN2yHvNdEDbS08i3oj0m7NIU",
  authDomain: "nolist-2a3d4.firebaseapp.com",
  projectId: "nolist-2a3d4",
  storageBucket: "nolist-2a3d4.firebasestorage.app",
  messagingSenderId: "601771236222",
  appId: "1:601771236222:web:8dfbb82d6553708758312f",
  measurementId: "G-S20SYW8PYQ"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();