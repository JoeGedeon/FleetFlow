// src/firebase.js
// Firebase initialization for FleetFlow — shared movemastersos project
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA0f42Pv4N7MDKWYixg5a-D3MrjldU--Pw",
  authDomain: "movemastersos.firebaseapp.com",
  projectId: "movemastersos",
  storageBucket: "movemastersos.firebasestorage.app",
  messagingSenderId: "422211525514",
  appId: "1:422211525514:web:e94d355b1720d816eec673"
};

// Prevent duplicate initialization (React hot-reload safe)
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const db  = getFirestore(app);
export const auth = getAuth(app);
export default app;
