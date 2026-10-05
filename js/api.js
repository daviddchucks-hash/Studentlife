import { auth } from "./firebase-config.js";
import { API_BASE_URL } from "./app-config.js";

export const apiConfigured = Boolean(API_BASE_URL);

export async function apiRequest(path, { method = "GET", body, authenticated = true } = {}) {
  if (!API_BASE_URL) {
    throw new Error("The Render API URL is not configured. Set API_BASE_URL in js/app-config.js after creating the Render service.");
  }

  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (authenticated) {
    const user = auth.currentUser;
    if (!user) throw new Error("Sign in to continue.");
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL.replace(/\/+$/, "")}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      mode: "cors",
      credentials: "omit"
    });
  } catch {
    throw new Error("Could not reach the Render API. Check the service URL and try again.");
  }

  if (response.status === 204) return null;
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The API returned an unreadable response.");
  }
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}
