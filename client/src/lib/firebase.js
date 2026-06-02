import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// TODO: Replace these placeholders with your actual Firebase project configuration
// Go to Firebase Console -> Project Overview -> Project settings -> General -> Your apps
const firebaseConfig = {
  apiKey: "AIzaSyBgajZSfibIUboSGtcMj7k33R9VHYNnCqk",
  authDomain: "fastpay-07.firebaseapp.com",
  projectId: "fastpay-07",
  storageBucket: "fastpay-07.firebasestorage.app",
  messagingSenderId: "447487824138",
  appId: "1:447487824138:web:af7b3f0b21cf6d299f6af3"
};

// Initialize Firebase
let app;
let auth;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase initialization error", error);
}

export { auth };
