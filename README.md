# AFITStudentLife

A mobile-first static student platform built with HTML, CSS, vanilla JavaScript, Firebase Authentication, and Firebase Realtime Database. GitHub Pages serves the frontend; there is no application server or build step.

## Firebase setup required

The Firebase web app configuration supplied for this repository did not include a Realtime Database URL. The standard project endpoints could not be verified, so `js/firebase-config.js` intentionally leaves `databaseURL` empty instead of sending private data to a guessed endpoint.

1. In the Firebase Console for `student-life-643be`, enable **Authentication → Sign-in method → Email/Password**.
2. Create or open **Realtime Database**. Copy its exact URL from the console (it can include a region in the hostname) into `databaseURL` in `js/firebase-config.js`.
3. Publish the rules in `firebase.rules.json` from **Realtime Database → Rules**.
4. In **Authentication → Settings → Authorized domains**, add the GitHub Pages host, such as `daviddchucks-hash.github.io`.

The app writes personal information only beneath `users/{uid}/...`. The included rules deny access by default and allow each signed-in user to read and write only their own subtree. The public `academicContent`, `formulas`, `courses`, and `departments` branches are readable but not writable from the app. No large academic datasets are bundled in the frontend.

## GitHub Pages

In the repository settings, open **Pages**, choose **Deploy from a branch**, select `main` and the `/ (root)` folder, then save. The site uses relative asset and page paths and does not need a server-side router or build process.

## Included tools

GPA, CGPA, semester weighted-average, grade, and course-unit calculators; registration planner; personal courses; personal timetable and generated weekly view; exam organizer and countdown; assignment and academic deadline trackers; semester planner; study timetable generator; and study session tracker.

Calculator defaults use a common 5-point grade-point input scale and indicative score boundaries. Students should verify their programme's grading scale with their department.
