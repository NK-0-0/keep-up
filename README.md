# KeepUp

Exam entry (DP) tracker for students. Capture the assessments that count towards
each module, enter marks as they come back, and KeepUp works out — module by
module — whether you have banked enough to qualify to write the exam.

Built to the canvas design in [`design/KeepUp.dc.html`](design/KeepUp.dc.html).

## Running it

```bash
npm install
npm start            # dev server on http://localhost:4200
npm test             # vitest in watch mode
npm run test:ci      # vitest, single run
npm run lint         # eslint (TypeScript + templates)
npm run format       # prettier --write  (format:check to verify only)
npm run build        # production build
```

Out of the box the app runs in **local mode**: same UI, same rules, data kept in
`localStorage`. Add a Firebase project (below) to switch it to Google sign-in
with cloud sync — no code changes needed.

## Connecting Firebase

1. Create a Firebase project, add a **Web app**, and enable **Authentication →
   Sign-in method → Google**.
2. Create a **Cloud Firestore** database.
3. Paste the web config into `src/environments/environment.ts` (production) and
   `src/environments/environment.development.ts` (local), replacing the
   `REPLACE_WITH_…` placeholders. These are public identifiers, not secrets —
   access is enforced by the rules below. See [Environments](#environments).
4. Deploy the rules in [`firestore.rules`](firestore.rules):
   `firebase deploy --only firestore:rules`.
5. Add your domain under **Authentication → Settings → Authorized domains**.

`FirebaseService.enabled` flips on once the placeholders are gone, and
`provideKeepUpData()` swaps the Firestore repositories in for the local ones.

### A note on the config values

Firebase web config is **not secret**. The `apiKey` identifies the project; it
is not an authorization credential. Because this is a browser app the values are
compiled into the shipped bundle regardless of where they are declared, so a
`.env` file would hide nothing — it would only move where you type them.
Committing them is the documented Firebase pattern.

Harden the project in the console instead:

- **API key restrictions** — Google Cloud Console → Credentials → HTTP referrer
  restrictions, limited to your domains.
- **Authorized domains** — Firebase Auth → Settings.
- **App Check** — attests that requests come from your app.
- **Firestore rules** — see `firestore.rules`, deny-by-default and uid-scoped.

Never put a genuine secret (a service account key, a private API token) in these
files; it would ship to every visitor.

### What you still need to do

1. **Deploy the security rules.** They are the only thing stopping one student
   reading another's marks — an unconfigured database is open.
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add          # pick your project, alias it "default"
   firebase deploy --only firestore:rules
   ```
2. **Fill in `src/environments/environment.ts`.** It still holds
   `REPLACE_WITH_…` placeholders, so a production build runs silently in
   localStorage mode with no sign-in. The development file is already configured.
3. **Check Authentication → Sign-in method → Google** is enabled, and that your
   production domain is listed under **Authentication → Settings → Authorized
   domains** (`localhost` is allowed by default).
4. **Restrict the API key** — Cloud Console → Credentials → HTTP referrers.

No composite indexes are needed: the only query is a single-field
`orderBy('order')`, which Firestore serves from the automatic index.
`firestore.indexes.json` is committed empty so `firebase deploy` has something
to point at.

### CRUD map

Every operation goes through `KeepUpStore`, which is the only writer. All data is
partitioned by the Firebase uid, so a student can only ever address their own
documents.

| Action in the UI                    | Store command         | Firestore effect                                        |
| ----------------------------------- | --------------------- | ------------------------------------------------------- |
| **+ New module**                    | `addModule`           | `setDoc` on `users/{uid}/modules/{new id}`              |
| Rename a module (pencil toggle)     | `updateModule`        | `setDoc` — same document id, new `code`/`title`         |
| DP bar stepper on a card            | `setModuleThreshold`  | `setDoc` with the module's `threshold` override         |
| **×** on a module                   | `removeModule`        | `deleteDoc`                                             |
| **+ Add assessment**                | `addAssessment`       | `setDoc` — appended to the module's `assessments` array |
| Edit an assessment name             | `setAssessmentName`   | `setDoc`                                                |
| Edit a weight                       | `setAssessmentWeight` | `setDoc`                                                |
| Edit a mark                         | `setAssessmentMark`   | `setDoc` (blank clears it back to "not written")        |
| **×** on an assessment              | `removeAssessment`    | `setDoc`                                                |
| Edit profile / qualification / year | `updateProfile`       | `setDoc` on `users/{uid}` with `merge: true`            |
| Default DP bar                      | `setDefaultThreshold` | `setDoc` on `users/{uid}` with `merge: true`            |
| Load sample semester                | `loadSample`          | Batched `writeBatch` replacing the collection           |
| Clear everything                    | `clearAll`            | Batched `writeBatch` deleting every module              |

Reads are live: `onSnapshot` on the module collection and the user document, so
a change made in one tab appears in the others without a refresh.

Assessments live inline on the module document rather than in a sub-collection.
They are always read and written together, a module holds a handful at most, and
this keeps every edit a single atomic write.

### Offline behaviour

`FirestoreService` enables a persistent local cache with multi-tab support.
Writes hit the cache immediately and queue for the server, so entering marks
works on patchy campus wifi and the UI never waits on the network. If IndexedDB
is unavailable — private browsing, or a browser that blocks it — it falls back
to the in-memory cache and everything still works, just without offline support.

### Data layout

```
users/{uid}                     profile { name, course, year }, defaultThreshold
users/{uid}/modules/{moduleId}  code, title, threshold, order, assessments[]
```

Assessments are stored inline on the module document: they are always read and
written together, and a module holds a handful of them at most.

## Environments

Two files, both type-checked against the `Environment` interface in
`environment.model.ts` — so a key added to one and forgotten in the other fails
the build rather than turning up as `undefined` at runtime.

| File                         | Used by                                               |
| ---------------------------- | ----------------------------------------------------- |
| `environment.ts`             | `ng build` (production) — the default                 |
| `environment.development.ts` | `ng serve` and `ng build --configuration development` |

The swap is `fileReplacements` under the `development` configuration in
`angular.json`; nothing imports the development file directly.

Each holds the Firebase config plus `apiBaseUrl`, which backs the `API_BASE_URL`
token the HTTP layer uses to resolve `/api/...` paths. Point the development
file at a **separate Firebase project**, so local experiments and seeded sample
data never touch real students' marks.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request,
as three parallel jobs so a failure points straight at what broke:

| Job                 | Runs                                         |
| ------------------- | -------------------------------------------- |
| Lint and formatting | `npm run lint`, `npm run format:check`       |
| Unit tests          | `npm run test:ci`                            |
| Build               | production build, then the development build |

The development build is included deliberately: without it, a mistake in
`environment.development.ts` would only surface the next time someone ran
`ng serve`.

Node comes from `.nvmrc`, so CI and local development stay on one version.
In-progress runs for a branch are cancelled when it is pushed again.

Linting is `angular-eslint` (flat config in `eslint.config.js`) over both
TypeScript and templates, including the template accessibility rules. Beyond the
recommended sets it enforces the house style: standalone components, `OnPush`
change detection, and the `app`/`ku` selector prefixes.

## Architecture

Layered so the DP rules — the part that actually matters — stay pure and
testable, and so no component ever touches the Firebase SDK.

| Layer    | Location           | Responsibility                                                                                                             |
| -------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Domain   | `src/app/domain`   | Models plus pure DP arithmetic and verdict copy. No Angular, no I/O.                                                       |
| Data     | `src/app/data`     | `ModulesRepository` / `PreferencesRepository` abstractions, with Firestore and `localStorage` implementations behind them. |
| Core     | `src/app/core`     | Firebase app/auth handles, the signal-based `AuthService`, and the route guards.                                           |
| State    | `src/app/state`    | `KeepUpStore` — signals in, derived values out, the only writer.                                                           |
| Features | `src/app/features` | Dashboard and sign-in screens; presentational components take inputs and emit outputs.                                     |

A few decisions worth knowing about:

- **Signals throughout, zoneless.** No `zone.js`; every component is
  `OnPush` and state flows through signals.
- **The repository seam is the whole point.** Swapping Firestore for
  `localStorage` is one factory in `data.providers.ts`, and the test suite uses
  the same seam to run without Firebase.
- **Firestore is not in the initial bundle.** `provideKeepUpData()` is declared
  on the lazily loaded `DashboardPage`, so the sign-in screen downloads ~100 kB
  gzipped instead of ~220 kB.
- **Routes render client-side** (`RenderMode.Client`). Every screen depends on a
  session that only exists in the browser, so a prerendered shell would just be
  thrown away at hydration.
- **The DP rules live in `dp-calculator.ts`** and are covered directly by
  `dp-calculator.spec.ts`, including the "even full marks cannot save this"
  case and the weights-don't-add-to-100 warning.

## Auth layer

`AuthService` (`src/app/core/auth`) is the only thing in the app that knows how
a session is established. Everything else reads its signals.

| Member               | Purpose                                                                           |
| -------------------- | --------------------------------------------------------------------------------- |
| `status`             | `pending` → `signed-in` / `signed-out`, or `local` when Firebase is unconfigured. |
| `user`               | uid, display name, email, photo — kept in step with token refreshes.              |
| `canAccessData`      | What the guards check.                                                            |
| `ownerId`            | The key the data layer partitions by.                                             |
| `getIdToken()`       | Bearer token for API calls; used by the HTTP layer.                               |
| `signInWithGoogle()` | Popup, falling back to a full-page redirect where popups are blocked.             |

Sign-in uses `browserLocalPersistence`, so a session survives a browser restart,
and `getRedirectResult` runs at startup to complete the redirect flow.

### Ending a session

`SessionRedirect` watches the auth status and returns the student to sign-in
when an **established** session ends. Watching the status rather than hooking
the sign-out button means it also covers a revoked or expired token and a
sign-out performed in another tab — Firebase propagates all of those the same
way. The initial `pending → signed-out` on a cold load is left to the guards, so
the two do not race and the `returnUrl` survives.

### Guards

- `authGuard` waits for `whenReady()` before deciding, so refreshing a protected
  page does not bounce you to sign-in while the session is still loading. It
  redirects to `/sign-in?returnUrl=…`.
- `guestGuard` keeps a signed-in student off the sign-in page and honours that
  `returnUrl`.
- `safeReturnUrl()` narrows the parameter to an in-app path, so a crafted link
  cannot redirect a freshly signed-in student off-site.

## HTTP layer

`provideKeepUpHttp()` registers `HttpClient` (with `withFetch()`) and the
interceptor chain. **The Firebase SDK has its own transport and does not go
through `HttpClient`** — none of this applies to auth or Firestore traffic. It
is here for your own backend API.

Order is the outbound order: a request runs top to bottom, the response comes
back bottom to top.

| #   | Interceptor     | Responsibility                                                                                                                                                                   |
| --- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `apiUrl`        | Expands `/api/...` against `API_BASE_URL`, so no host is hard-coded. Runs first so everything below sees the final URL.                                                          |
| 2   | `loading`       | Counts in-flight requests into `LoadingService` for the shell's progress bar — once per logical request, not per retry.                                                          |
| 3   | `error`         | Normalises `HttpErrorResponse` into `ApiFailure`, raises one notification, and treats a 401 as an expired session. Sits **outside** retry so only the final failure is reported. |
| 4   | `correlationId` | Adds `X-Request-Id`, shared across every attempt at the same request. App API only, to avoid needless CORS preflights.                                                           |
| 5   | `retry`         | Exponential backoff with jitter for transient failures, honouring `Retry-After`. Safe methods only.                                                                              |
| 6   | `timeout`       | Caps each attempt at 20 s and surfaces it as a 408, since `fetch` has no timeout of its own.                                                                                     |
| 7   | `authToken`     | Attaches the Firebase ID token. **Inside** retry, so each attempt gets a fresh token.                                                                                            |

### Per-request overrides

Set them via `HttpContext`:

```ts
import { HttpContext } from '@angular/common/http';
import { SKIP_ERROR_NOTIFICATION, MAX_RETRIES, REQUEST_TIMEOUT_MS } from './core/http/http.context';

http.get('/api/report', {
  context: new HttpContext()
    .set(REQUEST_TIMEOUT_MS, 0) // no timeout for a slow report
    .set(SKIP_ERROR_NOTIFICATION, true), // caller handles the error itself
});
```

`SKIP_AUTH_TOKEN`, `SKIP_LOADING` and `backgroundRequest()` (which sets both
`SKIP_ERROR_NOTIFICATION` and `SKIP_LOADING`) are available too.

### Two security decisions worth knowing about

- **The ID token only ever goes to your own API.** `isAppApiUrl()` compares
  parsed origins rather than string prefixes, so a lookalike host such as
  `https://api.yours.com.attacker.test` does not match and gets no credential.
- **No XSRF interceptor**, deliberately. Bearer tokens are not sent
  automatically by the browser, so there is nothing for CSRF to exploit. If you
  ever move to cookie-based sessions, add Angular's built-in
  `withXsrfConfiguration()` to `provideKeepUpHttp()`.

### Configuring the API origin

Same-origin backends need nothing. For a separate host, provide the token:

```ts
{ provide: API_BASE_URL, useValue: 'https://api.keepup.app' }
```

## Shared UI

| Component    | Notes                                                                                                                                                                                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ku-logo`    | The KeepUp mark — rising bars crossing a DP threshold line. Kept in step with `public/favicon.svg`, which is the same artwork.                                                                                                                                                                                                                         |
| `ku-avatar`  | The student's Google profile picture, falling back to initials. The fallback is not optional: a photo URL can 404 after an account change, and privacy extensions block `googleusercontent.com`, so `(error)` has to hand over to the initials at runtime. Requests the image at 2× via the `=sNN-c` suffix, and sends `referrerpolicy="no-referrer"`. |
| `ku-spinner` | Indeterminate ring, coloured from `currentColor`. Decorative — the host control announces the busy state via `aria-busy`. Falls back to a pulse under `prefers-reduced-motion`.                                                                                                                                                                        |

## Notifications

`NotificationService` holds a signal-backed stack rendered once by
`NotificationHost` in the app shell. Messages auto-dismiss after 8 s and
identical repeats collapse, so a burst of failing requests raises one banner
rather than a pile. Firestore errors stay as an inline alert on the dashboard,
where they belong to the data on screen.

## Tests

```bash
npx ng test --watch=false
```

81 tests, covering:

- the DP arithmetic and verdict copy, plus input parsing and clamping;
- the store against fake repositories;
- the dashboard rendering end to end (empty state, adding a module, layout
  toggle, clear-everything confirmation);
- the full interceptor chain against `HttpTestingController` — URL resolution,
  token attachment and the off-origin refusal, error normalisation, 401
  sign-out, retry backoff and `Retry-After`, and timeout handling;
- the guards, including the open-redirect cases for `returnUrl`;
- the sign-out redirect, including the cold-load case it must _not_ handle;
- the avatar's photo-to-initials fallback and the Google URL rewriting.

Suites that build a real `AuthService` call `provideUnconfiguredFirebase()` from
`src/testing`. Without it, `FirebaseService.enabled` is read from the
environment file, so the suite would pass on a fresh clone and fail once
somebody filled in their Firebase config. It also guarantees no test touches the
network.
