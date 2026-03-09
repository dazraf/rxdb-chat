# PRD: Subs (Topic-Based Rooms)

## Context

The app is a Reddit-style forum (RxDB offline-first, cursor-based replication, SSE live updates). Currently all posts live in a flat global feed with no categorization. This feature adds "subs" — topic rooms users can subscribe to. Every post belongs to a sub. The front page shows posts from subscribed subs (with a toggle to browse all). A collapsible sidebar provides quick navigation to subscribed subs. Any authenticated user can create subs.

---

## Data Model

### New: `SubDoc` (in `shared/schemas.ts`)

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID, primary key |
| name | string | Unique, lowercase (alphanumeric + hyphens, 3-50 chars) |
| description | string | Markdown |
| creatorId | string | User ID of creator |
| createdAt | string | ISO timestamp |
| updatedAt | number | Milliseconds epoch (replication cursor) |
| _deleted | boolean | Soft delete |

### New: `SubscriptionDoc`

| Field | Type | Notes |
|-------|------|-------|
| id | string | Composite: `${userId}_${subId}` |
| userId | string | User ID |
| subId | string | Sub ID |
| createdAt | string | ISO timestamp |
| updatedAt | number | Milliseconds epoch |
| _deleted | boolean | Soft delete |

Composite ID makes each user-sub pair unique and works with the existing TEXT PK replication. Unsubscribe = soft-delete (`_deleted: true`). Re-subscribe = upsert with `_deleted: false`.

### Modified: `PostDoc` — add `subId: string`

Existing posts migrate to a default "general" sub.

### New constants (`shared/constants.ts`)

- `DEFAULT_SUB_ID = 'general'`
- `POSTS_PAGE_SIZE = 100`

---

## Server Changes

### `server/src/db.ts`

- Add `subs` table (id PK, name UNIQUE, description, creatorId, createdAt, updatedAt, _deleted) with indexes on `(updatedAt, id)` and `name`
- Add `subscriptions` table (id PK, userId, subId, createdAt, updatedAt, _deleted) with indexes on `(updatedAt, id)` and `(userId, subId)`
- Idempotent migration: `ALTER TABLE posts ADD COLUMN subId TEXT NOT NULL DEFAULT 'general'` (try/catch like existing `themeMode` migration)
- Add index `idx_posts_sub ON posts (subId, createdAt)`
- Seed "general" sub with `INSERT OR IGNORE`

### `server/src/routes/replication.ts`

- Add `'subs'` and `'subscriptions'` to `VALID_COLLECTIONS`
- Add column maps:
  - `subs: [id, name, description, creatorId, createdAt, updatedAt, _deleted]`
  - `subscriptions: [id, userId, subId, createdAt, updatedAt, _deleted]`
- Add `subId` to `posts` column map
- Add ownership check for subscriptions (users can only push their own, similar to existing profiles check)

### `server/src/routes/auth.ts`

- On signup: auto-subscribe new user to "general" (insert subscription row)

---

## Client Changes

### `client/src/database/schemas.ts`

- Add `subSchema` (version 0, indexes: `updatedAt`, `name`)
- Add `subscriptionSchema` (version 0, indexes: `updatedAt`, `[userId, subId]`)
- Modify `postSchema`: bump to version 1, add `subId`, add index `[subId, createdAt]`

### `client/src/database/index.ts`

- Add `subs` and `subscriptions` to Collections type and `addCollections`
- Add migration strategy for posts v1: `(oldDoc) => ({ ...oldDoc, subId: 'general' })`

### `client/src/database/replication.ts`

- Add `'subs'` and `'subscriptions'` to the collections array (the rest is generic)

### `shared/schemas.ts`

- Add `SubDoc` and `SubscriptionDoc` interfaces
- Add `subId: string` to `PostDoc`

---

## New UI Components & Pages

### Sidebar (`client/src/components/SubSidebar.tsx`)

- Collapsible sidebar on the left side
- Shows user's subscribed subs (query subscriptions where userId=current, _deleted=false, then look up sub names)
- Each entry links to `/s/:subName`
- "Browse All" link at bottom → `/subs`
- "Create Sub" link → `/create-sub`
- Toggle button in NavBar to open/close (hamburger icon or "Subs" button)
- Sidebar overlays on mobile, persistent on wider screens

### Sub List Page (`client/src/pages/SubListPage.tsx`) — route `/subs`

- Lists all subs sorted by name
- Each card shows: name, description preview, subscribe/unsubscribe button
- "Create Sub" button at top

### Sub Detail Page (`client/src/pages/SubDetailPage.tsx`) — route `/s/:subName`

- Header: sub name, description (rendered markdown), subscribe/unsubscribe button
- Posts list: filtered by `subId`, sorted `createdAt desc`, paginated (100 at a time, infinite scroll)
- "New Post" button (pre-selects this sub via route state)

### Create Sub Page (`client/src/pages/CreateSubPage.tsx`) — route `/create-sub`

- Form: name (lowercase, alphanumeric + hyphens, 3-50 chars), description (markdown editor with existing MarkdownToolbar)
- On submit: insert sub, auto-subscribe creator, navigate to `/s/:subName`

### Infinite Scroll Hook (`client/src/hooks/useInfiniteScroll.ts`)

- Reusable IntersectionObserver hook
- Returns a sentinel ref to attach at bottom of list
- Calls `loadMore` when sentinel enters viewport

### Modified: `CreatePostPage.tsx`

- Add sub selector dropdown (query all subs)
- Pre-select sub if navigated from a sub page (via React Router state)
- Default to "general" if none selected
- Include `subId` in post document

### Modified: `PostCard.tsx`

- Show sub name: "in **subName**" in the meta line (pass sub name as prop or look up from subs collection)

### Modified: `PostDetailPage.tsx`

- Show which sub the post belongs to (link to `/s/:subName`)

### Modified: `HomePage.tsx`

- Default: show posts from subscribed subs only
- Toggle button: "All" / "Subscribed" to switch between global and personalized feed
- Paginated: initial 100 posts, infinite scroll for more
- Uses `useInfiniteScroll` hook

### Modified: `NavBar.tsx`

- Add sidebar toggle button (left side, before logo or after it)

### Modified: `App.tsx`

- Add routes: `/subs`, `/s/:subName`, `/create-sub`
- Integrate sidebar into layout (alongside `<main>`)

### CSS: `client/src/styles/app.css`

- Sidebar styles (width, slide animation, overlay on mobile)
- Sub card styles
- Toggle button styles
- Adjust main container for sidebar offset on desktop

---

## Implementation Order

### Step 1: Data model & shared types

- `shared/schemas.ts`: add SubDoc, SubscriptionDoc, modify PostDoc
- `shared/constants.ts`: add DEFAULT_SUB_ID, POSTS_PAGE_SIZE

### Step 2: Server schema & replication

- `server/src/db.ts`: new tables, migration, seed "general"
- `server/src/routes/replication.ts`: add collections, column maps, ownership check
- `server/src/routes/auth.ts`: auto-subscribe on signup
- Update/add server tests

### Step 3: Client schema & replication

- `client/src/database/schemas.ts`: new schemas, bump postSchema
- `client/src/database/index.ts`: add collections, migration
- `client/src/database/replication.ts`: add collection names
- Verify client type check passes

### Step 4: Sidebar & navigation

- Create SubSidebar component
- Modify NavBar (toggle button)
- Modify App.tsx (layout with sidebar, new routes)
- CSS for sidebar

### Step 5: Sub pages

- SubListPage (browse all subs)
- CreateSubPage (create new sub)
- SubDetailPage (view posts in a sub, with infinite scroll)
- Create useInfiniteScroll hook

### Step 6: Post-sub integration

- Modify CreatePostPage (sub selector)
- Modify PostCard (show sub name)
- Modify PostDetailPage (show sub link)
- Modify HomePage (subscribed feed, toggle, pagination)

### Step 7: Tests & docs

- Server unit tests for new collections, ownership, migration
- E2E tests for sub creation, navigation, subscribe/unsubscribe, post creation in sub
- Update README.md

---

## Verification

1. **Server tests**: `npm test -w server` — all pass including new sub/subscription replication tests
2. **Type check**: `npx tsc -b client --noEmit` — clean
3. **Client build**: `npm run build -w client` — succeeds
4. **E2E tests**: `npx playwright test` — all pass including new sub tests
5. **Manual smoke test**: create sub → subscribe → create post in sub → see post in sub feed and home feed → unsubscribe → post disappears from home "Subscribed" view but visible in "All" → infinite scroll works on 100+ posts
