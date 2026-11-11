# AFITStudentLife

AFITStudentLife is a lightweight student platform for AFIT. The frontend is plain HTML, CSS, and vanilla JavaScript served from GitHub Pages. An Express API on Render verifies Firebase Authentication ID tokens and accesses Firebase Realtime Database using a server-only Firebase Admin service account.

## Current deployment configuration

The Firebase web-app config is in `js/firebase-config.js`; its API key is public client configuration, not an Admin credential. The production Render API URL is configured in `js/app-config.js` as `https://studentlife-1-zcuc.onrender.com`. No Realtime Database URL or service-account private key was provided, and neither is guessed or committed.

## Set up Firebase

1. In Firebase Console for project `student-life-643be`, enable **Authentication → Sign-in method → Email/Password**.
2. Create/open **Realtime Database** and copy its exact HTTPS URL.
3. Apply `firebase.rules.json` under **Realtime Database → Rules**.
4. Add `daviddchucks-hash.github.io` under **Authentication → Settings → Authorized domains**.
5. Create a Firebase service-account key in **Project settings → Service accounts**. Keep the downloaded key private; do not add it to this repository.

The public web-app configuration is used only for client-side Firebase Authentication. The frontend never connects directly to Realtime Database. The Express API verifies each Firebase ID token, derives the UID from that verified token, and uses only allowlisted user-data paths. The Realtime Database rules deny direct client access to all `users` data (the Admin SDK on Render bypasses client rules); public content branches are read-only. Do not accept a UID from the browser as an authorization decision.

## Deploy the API to Render

1. Open the existing Render Web Service at `https://studentlife-1-zcuc.onrender.com`. Do not create another service or replace it with a new Blueprint.
2. In that service's **Environment** settings, verify the existing deployment matches `render.yaml` and set:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete Firebase service-account JSON, stored only in Render.
   - `FIREBASE_DATABASE_URL`: the exact Realtime Database URL copied from Firebase Console.
   - `FRONTEND_ORIGINS`: `https://daviddchucks-hash.github.io` (already specified in `render.yaml`; add a local development origin only when needed).
   - `ADMIN_EMAILS` or `ADMIN_UIDS`: a comma-separated allowlist of trusted administrator accounts; configure at least one before relying on moderation features.
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

## NoteSync and LectureTrack

The app includes a NoteSync module that keeps 100-level access enforcement on the backend. Approved typed lecture notes are exposed through the authenticated library API and filtered by department, level, semester, and academic session. File uploads are not configured. Withdrawal requests reserve AFT Coins and require manual administrator processing; the administrator must send payment outside the app before marking a request paid. No payment provider is connected.

The same integration also extends the existing timetable foundation into a lightweight LectureTrack capability: students can create lecture reminders and track attendance records using the same server-side validation and Firebase data layout without creating a separate application.

## CourseMate (Version 3)

CourseMate is part of the existing authenticated Express API and static frontend; it does not add another identity provider or direct client access to Firebase. Student discovery is opt-in. The server derives display name, department, level, bio, interests, and an HTTPS profile image from the existing profile, and never returns student number, email, or phone. Discovery, groups, questions, and partner matching are scoped to courses in a student's existing private course list.

Logical Realtime Database paths are under `coursemate/`:

- `profiles/{uid}` — discovery opt-in.
- `userCourseIndex/{uid}` and `courseParticipants/{courseKey}/{uid}` — server-maintained indexes of existing personal/registration course records and non-sensitive profile fields.
- `groups/{groupId}`, `groupsByCourse/{courseKey}/{groupId}`, `memberships/{groupId}/{uid}`, `joinRequests/`, and `groupInvitations/`.
- `messages/{groupId}/{messageId}` — member-only, timestamped discussion messages, paginated through the API.
- `questions/{questionId}`, `questionsByCourse/`, and `answers/{questionId}/{answerId}`.
- `partnerProfiles/`, `partnerIndex/`, `partnerRequests/`, `partnerInbox/`, `partners/`, and `partnerBlocks/`.
- `revisionSessions/{groupId}/{sessionId}` — group revision events and RSVP state.
- `reports/` and `moderationLog/` — content reports and admin moderation actions.

CourseMate uses these API routes (all require Firebase ID-token authentication unless noted; moderation routes also require the existing admin permission):

- `GET|PUT /api/coursemate/profile`, `GET /api/coursemate/courses`, `GET /api/coursemate/students`, `GET /api/coursemate/students/:uid`.
- `GET|POST /api/coursemate/groups`, `GET|PUT /api/coursemate/groups/:groupId`, plus membership, invitations, join-request, role, owner-transfer, messages, and revision-session subroutes.
- `GET|POST /api/coursemate/questions`, `GET|PUT|DELETE /api/coursemate/questions/:questionId`, with answer and accepted-answer subroutes.
- `GET|PUT /api/coursemate/partner-profile`, `GET /api/coursemate/partners`, and partner-request, block, connection subroutes.
- `POST /api/coursemate/reports`, `GET /api/coursemate/notifications`, notification read route, and `GET|PUT /api/admin/coursemate/reports`.

The new database paths inherit the root-deny Firebase rules and are accessed only by the Render Admin SDK. Existing users' course indexes must be initialized once after deployment using `npm run migrate:coursemate-index` with the same `FIREBASE_SERVICE_ACCOUNT_JSON` and `FIREBASE_DATABASE_URL` already configured for the API. The migration does not add environment variables or write to user profiles; it builds discovery indexes only from existing `courses/personal` and `courses/registration` records. New/changed courses and profiles are indexed on the existing authenticated API flows.

The existing course entry feature permits students to maintain their own list and is not an institution-verified registrar catalogue. CourseMate does not accept a new course directly in its group/question forms, but its course eligibility necessarily reflects that existing source. Connecting to an authoritative registrar/course catalogue requires that service/data to be available. File attachments, an external calendar export, notification preference controls, and account suspension are not added; the existing repository has no verified upload storage, academic calendar API, notification preference model, or account moderation service. Approved NoteSync links are referenced by ID rather than copied.

## Before public launch

The campus-life pages intentionally withhold hostel, transport, dining, health, organization, business, and emergency-contact details until they can be verified against current official AFIT information. Do not publish unverified contacts or service claims.

Before announcing the site publicly, verify the existing Render service returns `{"ok":true}` from `/api/health`, confirm Firebase Authentication and Realtime Database configuration, and test sign-up/sign-in, profile updates, private student data access, lost-and-found claims and moderation, NoteSync reviews and withdrawal reconciliation, and admin authorization using dedicated test accounts. Confirm the GitHub Pages origin and admin allowlist are configured in Render. Keep service-account credentials only in Render and never use real student bank details or accounts for smoke tests.

## Local checks

Run `npm test` to exercise API validation, calculator behavior, and syntax-check every browser JavaScript module as an ES module. To start the API locally, set the same Firebase Admin and database environment variables used on Render, then run `npm start`. Never commit `.env` files or service-account JSON.
