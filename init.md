# Admin Dashboard — Project Initialization Guide

Admin dashboard for **Con Đường Lịch Sử**, managing all content, users, and gamification data via Supabase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Create React App + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Routing | React Router v6 |
| Data | `@supabase/supabase-js` (direct DB via PostgREST) |
| Auth | Supabase Auth (email + Google OAuth) |
| Tables | TanStack Table v8 |
| Forms | React Hook Form + Zod |
| Maps | Leaflet + react-leaflet |
| Charts | Recharts |

## Setup Steps

### 1. Create the project

```bash
npx create-react-app conduonglichsu-admin --template typescript
cd conduonglichsu-admin
```

### 2. Install Tailwind CSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Add to `tailwind.config.js`:
```js
content: ["./src/**/*.{ts,tsx}"]
```

Add to `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 3. Install shadcn/ui

```bash
npx shadcn-ui@latest init
```

### 4. Install dependencies

```bash
npm install \
  @supabase/supabase-js \
  react-router-dom \
  react-hook-form \
  zod \
  @hookform/resolvers \
  @tanstack/react-table \
  recharts \
  leaflet \
  react-leaflet \
  @types/leaflet
```

### 5. Environment variables

Create `.env`:
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 6. Supabase client

`src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
)
```

### 7. Auth context

`src/contexts/AuthContext.tsx` — after login, fetch `users` table to get `role`. Redirect to `/login` if role is not `admin` or `super_admin`.

### 8. Routing structure

`src/App.tsx`:
```tsx
<Router>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>       {/* checks admin role */}
      <Route element={<DashboardLayout />}>    {/* sidebar + header */}
        <Route path="/" element={<HomePage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/heroes" element={<HeroesPage />} />
        <Route path="/heroes/:id/events" element={<HeroEventsPage />} />
        <Route path="/streets" element={<StreetsPage />} />
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route path="/challenges/:id/submissions" element={<SubmissionsPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/badges" element={<BadgesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
    </Route>
  </Routes>
</Router>
```

## Admin Actors

### Users (`users` table)
- List with search (email, name), filter by role
- View profile: points, level, streak, badges earned
- Edit: `role` (user/admin/super_admin)
- View exploration history (`exploration_history` table)

### Heroes (`heroes` table)
- List with filters: `era`, `category`, `province`, full-text search via `search_vector`
- Create / Edit / Delete
- Fields: `full_name`, `alias_name`, `birth_year`, `death_year`, `era`, `category`, `bio`, `image_url`, `province`

### Hero Events (`hero_events` table, nested under Hero detail)
- List timeline per hero
- Create / Edit / Delete
- Types: `birth`, `battle`, `achievement`, `death`, `other`
- Fields: `year`, `title`, `description`, `location`

### Streets (`streets` table)
- List with filter by `hero_id`, `province`
- Create / Edit / Delete
- Fields: `name`, `hero_id`, `lat`, `lng` (geom auto-computed by DB trigger), `province`, `description`
- Map preview using Leaflet on detail page

### Challenges (`challenges` table)
- List with filter by `type` (checkin/cipher/race/quiz), `status` (active/upcoming/ended)
- Create / Edit / Delete
- Fields: `title`, `description`, `type`, `hero_id`, `street_id`, `target_lat`, `target_lng`, `radius_meters`, `start_at`, `end_at`, `reward_points`, `badge_id`

### Challenge Submissions (`challenge_submissions` table)
- List per challenge, filter by `status` (pending/approved/rejected)
- View: GPS coords, photo (`photo_url`), distance, submitted_at
- Actions: Approve → `status = 'approved'`, Reject → `status = 'rejected'`
- Note: approving should also trigger points addition to `users.points` (via DB function or manual update)

### Posts (`posts` table) — Moderation
- List feed with `like_count`, `comment_count`
- View post with media (`post_media`)
- Delete (cascade removes likes, comments)

### Comments (`comments` table) — Moderation
- List per post with `like_count`
- Delete

### Badges (`badges` table)
- List all badges
- Create / Edit / Delete
- Fields: `name`, `description`, `image_url`, `rarity` (common/rare/epic/legendary), `code` (unique)
- View which users have earned each badge (`user_badges`)

### Notifications (`notifications` table)
- List with filter by `type`, `is_read`
- Create broadcast notification (insert row per target user)
- Delete
- Types: `badge`, `challenge`, `hero`, `community`, `location`, `system`

## Dashboard Home — Stats
Query counts from each table for overview cards:
- Total users, heroes, streets, active challenges
- Pending submissions (requiring review)
- Posts this week

## Supabase Query Patterns

```ts
// Paginated list with search
const { data, count } = await supabase
  .from('heroes')
  .select('*', { count: 'exact' })
  .ilike('full_name', `%${search}%`)
  .range(from, to)

// Approve a submission
await supabase
  .from('challenge_submissions')
  .update({ status: 'approved' })
  .eq('id', submissionId)

// Upload hero image
const { data } = await supabase.storage
  .from('images')
  .upload(`heroes/${heroId}.jpg`, file)

// PostGIS nearby (via RPC if needed)
await supabase.rpc('find_nearby_streets', { lat, lng, radius_m: 500 })
```

## Supabase RLS Policies Required
Ensure these Row Level Security policies exist on Supabase:
- All tables: `SELECT`, `INSERT`, `UPDATE`, `DELETE` allowed for users with `role = 'admin'` or `role = 'super_admin'`
- `users` table: admins can read all rows; super_admin can change roles
- `challenge_submissions`: admins can update `status`

## Folder Structure (recommended)

```
src/
  lib/
    supabase.ts          # Supabase client
  contexts/
    AuthContext.tsx      # Auth + role state
  components/
    layout/              # DashboardLayout, Sidebar, Header
    ui/                  # shadcn components
    shared/              # DataTable, ConfirmDialog, ImageUpload
  pages/
    LoginPage.tsx
    HomePage.tsx         # Stats overview
    users/
    heroes/
    streets/
    challenges/
    posts/
    badges/
    notifications/
  types/
    database.ts          # TypeScript types matching DB schema
```

## Database Types

Generate TypeScript types from Supabase:
```bash
npx supabase gen types typescript --project-id your-project-id > src/types/database.ts
```
