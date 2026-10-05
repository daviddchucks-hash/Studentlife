import { auth } from "./firebase-config.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const form = document.querySelector("#auth-form");
const message = document.querySelector("#form-message");
const isSignup = window.location.pathname.endsWith("/signup.html");
const submitButton = form.querySelector('button[type="submit"]');
let isSubmitting = false;

function showMessage(text, success = false) {
  message.textContent = text;
  message.classList.toggle("success", success);
}

const friendlyErrors = {
  "auth/email-already-in-use": "An account already uses this email. Try signing in instead.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/invalid-credential": "That email and password combination was not recognized.",
  "auth/weak-password": "Choose a stronger password with at least 6 characters.",
  "auth/network-request-failed": "Connection failed. Check your internet and try again.",
  "auth/too-many-requests": "Too many attempts. Wait a little and try again."
};

onAuthStateChanged(auth, (user) => {
  if (user && !isSubmitting) window.location.replace("./dashboard.html");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");
  if (!form.reportValidity()) return;

  const values = new FormData(form);
  const email = String(values.get("email")).trim().toLowerCase();
  const password = String(values.get("password"));
  const name = String(values.get("name") || "").trim();
  if (isSignup && password !== String(values.get("confirmPassword"))) {
    showMessage("The passwords do not match.");
    return;
  }

  submitButton.disabled = true;
  isSubmitting = true;
  submitButton.textContent = isSignup ? "Creating account…" : "Signing in…";
  try {
    await setPersistence(auth, browserLocalPersistence);
    if (isSignup) {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(credential.user, { displayName: name });
      window.location.replace("./dashboard.html");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.replace("./dashboard.html");
    }
  } catch (error) {
    showMessage(friendlyErrors[error.code] || "We could not complete that request. Check your details and try again.");
    isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = isSignup ? "Create account" : "Sign in";
    if (auth.currentUser) window.location.replace("./dashboard.html");
  }
});
