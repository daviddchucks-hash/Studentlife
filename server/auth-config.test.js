"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createFirebaseWebConfigResolver } = require("./firebase-web-config");

test("resolveFirebaseWebConfig prefers explicit FIREBASE_API_KEY from environment", async () => {
  let calledFetch = false;
  const resolve = createFirebaseWebConfigResolver({
    projectId: "student-life-643be",
    databaseURL: "https://student-life-643be-default-rtdb.firebaseio.com",
    env: { FIREBASE_API_KEY: "test-explicit-web-key" },
    fetchImpl: async () => {
      calledFetch = true;
      return { ok: false };
    }
  });

  const config = await resolve();
  assert.equal(calledFetch, false);
  assert.equal(config.apiKey, "test-explicit-web-key");
  assert.equal(config.projectId, "student-life-643be");
  assert.equal(config.authDomain, "student-life-643be.firebaseapp.com");
  assert.equal(config.databaseURL, "https://student-life-643be-default-rtdb.firebaseio.com");
});

test("resolveFirebaseWebConfig resolves and caches Web App config via Firebase Management API when FIREBASE_API_KEY is unset", async () => {
  let fetchCalls = 0;
  const fakeAdminApp = {
    options: {
      credential: {
        async getAccessToken() {
          return { access_token: "ya29.mock-service-account-token" };
        }
      }
    }
  };

  const resolve = createFirebaseWebConfigResolver({
    adminApp: fakeAdminApp,
    projectId: "student-life-643be",
    databaseURL: "https://student-life-643be-default-rtdb.firebaseio.com",
    env: {},
    fetchImpl: async (url, options) => {
      fetchCalls += 1;
      assert.equal(options.headers.Authorization, "Bearer ya29.mock-service-account-token");
      assert.match(url, /firebase\.googleapis\.com\/v1beta1\/projects\/student-life-643be\/webApps\/.*\/config$/);
      return {
        ok: true,
        async json() {
          return {
            projectId: "student-life-643be",
            appId: "1:703601899893:web:fbe9cf5b4f4df1dc54fb3c",
            apiKey: "resolved-web-config-key",
            authDomain: "student-life-643be.firebaseapp.com"
          };
        }
      };
    }
  });

  const first = await resolve();
  const second = await resolve();
  assert.equal(fetchCalls, 1);
  assert.equal(first.apiKey, "resolved-web-config-key");
  assert.equal(second.apiKey, "resolved-web-config-key");
  assert.equal(first.databaseURL, "https://student-life-643be-default-rtdb.firebaseio.com");
});

test("resolveFirebaseWebConfig falls back to API Keys lookup when Firebase Management API returns 403", async () => {
  const fakeAdminApp = {
    options: {
      credential: {
        async getAccessToken() {
          return { access_token: "ya29.mock-token" };
        }
      }
    }
  };

  const resolve = createFirebaseWebConfigResolver({
    adminApp: fakeAdminApp,
    projectId: "student-life-643be",
    databaseURL: "https://student-life-643be-default-rtdb.firebaseio.com",
    env: {},
    fetchImpl: async (url) => {
      if (url.includes("firebase.googleapis.com")) {
        return { ok: false, status: 403 };
      }
      if (url.endsWith("/locations/global/keys")) {
        return {
          ok: true,
          async json() {
            return {
              keys: [
                { name: "projects/student-life-643be/locations/global/keys/k1", displayName: "Browser key (auto created by Firebase)" }
              ]
            };
          }
        };
      }
      if (url.endsWith("/k1/keyString")) {
        return {
          ok: true,
          async json() {
            return { keyString: "resolved-from-apikeys-v2" };
          }
        };
      }
      return { ok: false, status: 404 };
    }
  });

  const config = await resolve();
  assert.equal(config.apiKey, "resolved-from-apikeys-v2");
  assert.equal(config.projectId, "student-life-643be");
});

test("resolveFirebaseWebConfig returns null gracefully if credentials cannot access config", async () => {
  const resolve = createFirebaseWebConfigResolver({
    adminApp: { options: { credential: { async getAccessToken() { throw new Error("no token"); } } } },
    projectId: "student-life-643be",
    env: {},
    fetchImpl: async () => ({ ok: false })
  });

  const config = await resolve();
  assert.equal(config, null);
});
