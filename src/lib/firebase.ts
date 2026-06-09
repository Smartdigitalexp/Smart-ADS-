import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp,
  deleteDoc,
  doc,
  getDoc,
  setDoc
};
