// src/lib/auth.ts
import { auth } from "./firebase";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from "firebase/auth";

// Function to Log In
export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login failed", error);
  }
};

// Function to Log Out
export const logout = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Logout failed", error);
  }
};