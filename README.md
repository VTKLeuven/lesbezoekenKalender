# Lesbezoeken Calendar

A React calendar app for planning and tracking classroom visits (*lesbezoeken*). Events are pulled from a Google Sheets backend via a Google Apps Script web app and displayed in month, week, or day view. Each organisation is automatically assigned a colour. The calendar checks for sheet updates every 2 minutes and supports filtering by field value.

---

## Architecture

```
Browser (React)
    │  JWT in sessionStorage
    ▼
Express server  (server/index.js, port 3001)
    │  Bearer token auth · admin middleware
    ▼
Google Apps Script web app
    │
    ▼
Google Sheet  (source of truth for all visit data)
```

- **React frontend** — calendar UI, filter, admin controls
- **Express backend** — authenticates users, proxies all Sheet calls server-side (secrets never reach the browser), stores locally-proposed meets/edits in `server/local-meets.json`
- **Google Apps Script** — reads/writes the Google Sheet, returns JSON, applies row colours for approval status

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A Google Apps Script web app deployed from your Google Sheet
- An API key shared between the script and this server

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the server environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

| Variable | Description |
|---|---|
| `JWT_SECRET` | Long random string used to sign JWTs. Generate with `openssl rand -hex 32`. |
| `WEB_APP_URL` | Google Apps Script deployment URL. |
| `API_KEY` | Shared secret between this server and the Apps Script. |
| `PORT` | Port for the Express server (default: `3001`). |

### 3. Create `server/users.json`

```bash
cp server/users.example.json server/users.json
```

Generate bcrypt hashes for each user's password:

```bash
npm run hash-password yourpassword
```

Paste the printed hash into the `passwordHash` field for the relevant user in `server/users.json`.

---

## User roles

| Role | Can do |
|---|---|
| `admin` | See all events, approve/reject pending meets, add new meets, propose edits, create user accounts |
| `user` | View approved (and their own) events; optionally restricted to specific organisations via `allowedHosts` |

Users with `allowedHosts: null` see all events but have no admin privileges.

---

## Running the app

### Development

Starts the React dev server (port 3000) and the Express API server (port 3001) concurrently:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). The page reloads on file changes.

### Production

Build the React app, then serve everything from the Express server:

```bash
npm run build
npm run start:prod
```

Open [http://localhost:3001](http://localhost:3001) (or whatever port you configured).

#### With PM2

```bash
npm run build
pm2 start ecosystem.config.js --env production
```

---

## Project structure

```
├── public/              # Static HTML, favicon, web manifest
├── server/
│   ├── .env             # Secrets — gitignored, never commit
│   ├── .env.example     # Template for server/.env
│   ├── auth.js          # JWT middleware (requireAuth, requireAdmin)
│   ├── config.js        # Reads env vars, exports typed config
│   ├── hash-password.js # CLI utility: node server/hash-password.js <pw>
│   ├── index.js         # Express app — all API routes
│   ├── users.example.json
│   └── users.json       # User accounts — gitignored, never commit
└── src/
    ├── components/      # React components (App, Root, LoginPage, modals)
    ├── context/         # AuthContext (login / logout / session state)
    └── utils/           # Data fetching, Meet class, helpers, colour map
```

---

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/login` | — | Exchange credentials for a JWT |
| GET | `/api/me` | user | Return current user info |
| GET | `/api/data` | user | Fetch all meet rows from the Sheet |
| GET | `/api/check-update` | user | Check Sheet's last-modified timestamp |
| POST | `/api/approve` | admin | Approve or reject a pending meet (sets row colour) |
| POST | `/api/meets` | admin | Add a new proposition row to the Sheet |
| PATCH | `/api/meets/:id` | admin | Propose field edits (stored as cell notes + local override) |
| POST | `/api/users` | admin | Create a new user account |
