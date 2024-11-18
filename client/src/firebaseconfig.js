// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage"; // Import Firebase Storage

// Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyCLk98R3PwHZYjTY-Ed3xFeGmy4tnZnDzU",
//   authDomain: "pitchdeckclassifier.firebaseapp.com",
//   projectId: "pitchdeckclassifier",
//   storageBucket: "pitchdeckclassifier.firebasestorage.app", // Use correct bucket format
//   messagingSenderId: "823771885885",
//   appId: "1:823771885885:web:dae23c3cccfc69d8f51554",
//   measurementId: "G-FLLSFK7H1Z"
// };

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const storage = getStorage(app); // Initialize Firebase Storage

export { app, analytics, storage }; // Export storage for use in other components
