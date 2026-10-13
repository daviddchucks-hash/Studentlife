# AFITStudentLife

AFITStudentLife is a lightweight student platform for AFIT. The frontend is plain HTML, CSS, and vanilla JavaScript served from GitHub Pages. An Express API on Render verifies Firebase Authentication ID tokens and accesses Firebase Realtime Database using a server-only Firebase Admin service account.

## Current deployment configuration

The Firebase web-app config is in `js/firebase-config.js`; its API key is public client configuration, not an Admin credential. The production Render API URL is configured in `js/app-config.js` as `https://studentlife-r8k1.onrender.com`. No Realtime Database URL or service-account private key was provided, and neither is guessed or committed.

## Set up Firebase

1. In Firebase Console for project `student-life-643be`, enable **Authentication → Sign-in method → Email/Password**.
2. Create/open **Realtime Database** and copy its exact HTTPS URL.
3. Apply `firebase.rules.json` under **Realtime Database → Rules**.
4. Add `daviddchucks-hash.github.io` under **Authentication → Settings → Authorized domains**.
5. Create a Firebase service-account key in **Project settings → Service accounts**. Keep the downloaded key private; do not add it to this repository.

The public web-app configuration is used only for client-side Firebase Authentication. The frontend never connects directly to Realtime Database. The Express API verifies each Firebase ID token, derives the UID from that verified token, and uses only allowlisted user-data paths. The Realtime Database rules deny direct client access to all `users` data (the Admin SDK on Render bypasses client rules); public content branches are read-only. Do not accept a UID from the browser as an authorization decision.

## Deploy the API to Render

1. In Render, create a **Blueprint** from this GitHub repository and use `render.yaml`.
2. Set the prompted Render environment values:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete Firebase service-account JSON, stored only in Render.
   - `FIREBASE_DATABASE_URL`: the exact Realtime Database URL copied from Firebase Console.
   - `FRONTEND_ORIGINS`: `https://daviddchucks-hash.github.io` (already specified in the Blueprint; add a local development origin only when needed).
3. The current Render URL is already set as `API_BASE_URL` in `js/app-config.js`. If the service URL changes, update that public URL (without a trailing slash) and push the frontend change.
4. The Render health check is `GET /api/health`. Authenticated routes require `Authorization: Bearer <Firebase ID token>`.

The Blueprint uses Render's free plan for initial setup; free services may sleep when idle. Choose an always-on plan in Render if the live platform needs it.

## Deploy the frontend to GitHub Pages

In repository **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save. The expected site URL is `https://daviddchucks-hash.github.io/Studentlife/`. All static links are relative and there is no frontend build step.

## API and data layout

- `GET /api/me` — verified signed-in user profile.
- `GET /api/dashboard` — per-user courses, upcoming assignments/deadlines/exams, and real study/course summaries.
- `GET|POST /api/records/:type` — list or create a validated allowlisted record.
- `DELETE /api/records/:type/:id` — remove a record belonging to the verified user.
- `GET /api/content/:section` — public `academicContent`, `formulas`, `courses`, or `departments`.

Private records live under `users/{uid}/courses/...`, `timetable`, `exams`, `assignments`, `deadlines`, `semesterPlan`, `studyPlans`, and `studySessions`. Database rules deny access by default and additionally restrict direct authenticated access to each user's own subtree; the Admin SDK is used only on Render.

## Academic tools

The dashboard includes GPA, CGPA, semester weighted-average, grade, and course-unit calculators; registration planner; personal course list; personal timetable and generated weekly view; exam organizer/countdown; assignment and academic deadline trackers; semester planner; study timetable generator; and study session tracker. Calculations run in the browser without database requests. Personal records use the authenticated Render API.

The calculators use a common 5-point grade-point input scale and indicative score boundaries. Students should verify their programme's grading scale with their department.

## Local checks

Run `npm test` to exercise API validation, calculator behavior, and syntax-check every browser JavaScript module as an ES module. To start the API locally, set the same Firebase Admin and database environment variables used on Render, then run `npm start`. Never commit `.env` files or service-account JSON.
