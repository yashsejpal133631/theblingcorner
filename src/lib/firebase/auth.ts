"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, UserCredential } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDMpt0lHW8CH8I7L_aB_CufqWkUydvXuuQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "theblingcorner.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "theblingcorner",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "theblingcorner.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "470753262737",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:470753262737:web:3efed22a57c95007f1d330",
};

// Initialize Firebase safely for client-side execution
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export interface GoogleAuthUser {
  idToken: string;
  email: string;
  name: string | null;
  image: string | null;
}

/**
 * Triggers standard Google Sign-In popup via Firebase Auth
 */
export async function signInWithGoogle(): Promise<GoogleAuthUser> {
  const result: UserCredential = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const idToken = await user.getIdToken();

  if (!user.email) {
    throw new Error("Unable to retrieve email from Google account.");
  }

  return {
    idToken,
    email: user.email.toLowerCase().trim(),
    name: user.displayName || null,
    image: user.photoURL || null,
  };
}
