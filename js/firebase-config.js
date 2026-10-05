import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Firebase's web config identifies the app; it is not an admin credential.
export const firebaseConfig = {
  apiKey: "AIzaSyDjuLbTHp3JOk70Jm66sqqKTrrmqd8JrO8",
  authDomain: "student-life-643be.firebaseapp.com",
  projectId: "student-life-643be",
  storageBucket: "student-life-643be.firebasestorage.app",
  messagingSenderId: "703601899893",
  appId: "1:703601899893:web:fbe9cf5b4f4df1dc54fb3c",
  measurementId: "G-VQZRGRNK70"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
