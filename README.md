# RxDB Chat

<video src="docs/demo.mp4" autoplay loop muted playsinline controls style="max-height: 33vh; width: auto;"></video>

An offline-first Reddit-style discussion app built with RxDB, React, and Express. Data is stored locally in IndexedDB and syncs to a SQLite backend via HTTP push/pull replication with real-time SSE updates.

Users can create posts, leave comments, and continue using the app while the server is down - everything syncs automatically when connectivity is restored.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Client | React 18, React Router v6, TypeScript, Vite |
| Local DB | RxDB 16 with Dexie.js (IndexedDB) |
| Server | Express 4, better-sqlite3, JWT auth |
| Real-time | Server-Sent Events (SSE) via RxJS |
| Testing | Vitest + Supertest (server), Playwright (E2E) |

## Project Structure

```
rxdb-chat/
├── client/             React SPA (Vite dev server on :5173)
│   └── src/
│       ├── auth/       Auth context + API calls
│       ├── database/   RxDB setup, schemas, replication
│       ├── hooks/      useOnlineStatus (health polling)
│       ├── components/ NavBar, PostCard, CommentForm, etc.
│       ├── pages/      Login, Signup, Home, CreatePost, PostDetail
│       └── styles/
├── server/             Express API (port 3001)
│   └── src/
│       ├── routes/     /auth (signup/login), /replication (push/pull/stream)
│       ├── middleware/  JWT auth middleware
│       ├── db.ts       SQLite setup + schema
│       ├── sse.ts      RxJS Subject for broadcasting changes
│       └── app.ts      Express app factory
├── shared/             TypeScript interfaces shared by client + server
├── e2e/                Playwright end-to-end tests
└── playwright.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

This starts both the server (`:3001`) and client (`:5173`) in parallel. Open [http://localhost:5173](http://localhost:5173) in your browser.

You can also run them separately:

```bash
npm run server   # Express API on :3001
npm run client   # Vite dev server on :5173
```

## How It Works

### Offline-First Architecture

All reads and writes happen against the local RxDB/IndexedDB database first. The app is fully functional without a server connection.

Replication runs in the background using RxDB's replication plugin with a custom HTTP+SSE transport:

- **Push**: Local changes are POSTed to the server in batches with optimistic conflict detection
- **Pull**: The client fetches new documents using cursor-based pagination (`updatedAt` + `id`)
- **SSE Stream**: The server broadcasts changes in real-time so other clients receive updates immediately

### Server Recovery

When the server goes down and comes back:

1. **SSE heartbeats** - The server sends a heartbeat every 5 seconds. If the client receives nothing for 10 seconds, it considers the connection stale and reconnects
2. **Health polling** - The client polls `/api/health` every 5 seconds and tracks server status via an RxJS `BehaviorSubject`
3. **Auto-reconnect** - On reconnection, the client triggers `reSync()` to pull any missed changes

This handles edge cases like reverse proxies (e.g. Vite) holding SSE connections open after the backend dies.

### Authentication

- Signup/login with username + password (bcrypt hashed)
- JWT tokens (7-day expiry) stored in `localStorage`
- SSE connections authenticate via `?token=` query parameter (since `EventSource` can't set headers)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server + client |
| `npm run server` | Start server only |
| `npm run client` | Start client only |
| `npm test` | Run server unit/integration tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run clear-posts` | Soft-delete all posts and comments |

## Testing

### Server Tests (Vitest)

```bash
npm test
```

23 tests covering auth middleware, signup/login routes, and replication push/pull/conflict handling. Tests use in-memory SQLite databases for full isolation.

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

14 tests across three suites:

- **Auth** - Signup, login, duplicate username handling, unauthenticated redirects
- **Posts** - Create post, navigate to detail, verify on home page
- **Offline Sync** - Two separate browsers: both post comments while the server is down, server restarts, both see each other's comments

The offline sync test launches two independent Chromium instances and manages the server lifecycle directly to verify real-world sync behavior.
