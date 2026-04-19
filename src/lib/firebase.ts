import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC05cDopaNvAnGLm-YQlXk9i9Lj86IMHTo",
  authDomain: "pokebulk-sa.firebaseapp.com",
  projectId: "pokebulk-sa",
  storageBucket: "pokebulk-sa.firebasestorage.app",
  messagingSenderId: "534697395671",
  appId: "1:534697395671:web:21c861631c4bad5d117792",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;