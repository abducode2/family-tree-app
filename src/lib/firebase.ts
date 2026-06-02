import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';



const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
// export const firebaseConfig = {
//   apiKey: "AIzaSyAqs8v_qbb7cv2_0kCUAfKvF-DrF9fbXLI",
//   authDomain: "family-tree-app-dc25a.firebaseapp.com",
//   projectId: "family-tree-app-dc25a",
//   storageBucket: "family-tree-app-dc25a.firebasestorage.app",
//   messagingSenderId: "118739425232",
//   appId: "1:118739425232:web:da6d59ee3a587d278bcbd5",
//   measurementId: "G-0GTXZFQPKM",
// };

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
