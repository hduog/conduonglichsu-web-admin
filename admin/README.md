# Con Đường Lịch Sử — Admin Dashboard

Admin dashboard for the **Con Đường Lịch Sử** gamified Vietnamese history education app.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 18 + TypeScript (Vite) |
| Routing | React Router v6 |
| Data access | Supabase JS client |
| UI components | shadcn/ui + Tailwind CSS |
| Data tables | TanStack Table v8 |
| Forms | React Hook Form + Zod |
| Maps | Leaflet |
| Charts | Recharts |

## Getting Started

```bash
cd admin
cp .env.example .env      # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Access requires an account with role `admin` or `super_admin` in the `users` table.

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Overview stats and charts |
| `/heroes` | Heroes | CRUD for Vietnamese historical figures |
| `/heroes/:id/events` | Hero Events | Timeline events per hero |
| `/streets` | Streets | GPS-tagged streets with Leaflet map |
| `/challenges` | Challenges | Challenge management |
| `/community` | Community | Posts, likes, comments moderation |
| `/users` | Users | User management |
| `/notifications` | Notifications | In-app notification management |

## Features

### Heroes Page (`/heroes`)

Full CRUD for the `heroes` table with search, pagination, and CSV import/export.

#### Export CSV

Click **Xuất CSV** to download all heroes (all pages) as a UTF-8 CSV file named `heroes_YYYY-MM-DD.csv`.

CSV columns (in order):

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Auto-generated, included for reference |
| `full_name` | string | Required |
| `alias_name` | string | Nullable |
| `birth_year` | integer | Nullable |
| `death_year` | integer | Nullable |
| `province` | string | |
| `era` | enum | `hung_vuong` \| `bac_thuoc` \| `ly_tran` \| `le` \| `nguyen` \| `can_dai` |
| `category` | enum | `military` \| `politics` \| `culture` \| `science` |
| `bio_short` | string | Short biography |
| `bio_full` | string | Nullable, full biography |
| `avatar_url` | string | Nullable, URL to image in Supabase Storage |
| `quote` | string | Nullable |
| `created_at` | timestamp | Auto-generated |
| `updated_at` | timestamp | Auto-generated |

#### Import CSV

Click **Nhập CSV** and select a `.csv` file. The file must have a header row matching the column names above.

- `id`, `created_at`, `updated_at` are ignored (DB auto-generates them)
- `birth_year` and `death_year` are coerced to integers
- Empty cells are treated as `null`
- Quoted fields with embedded commas or newlines are supported
- A result banner shows how many rows succeeded and how many failed

**Template:** Export once to get a correctly formatted file, fill in new rows, then re-import.

### Streets Page (`/streets`)

Full CRUD for the `streets` table with search, pagination, and CSV import/export.

#### Export CSV

Click **Xuất CSV** to download all streets (all pages) as a UTF-8 CSV file named `streets_YYYY-MM-DD.csv`.

CSV columns (in order):

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Auto-generated, included for reference |
| `name` | string | Street name |
| `city` | string | |
| `province` | string | |
| `hero_id` | UUID | FK to `heroes.id` |
| `lat` | float | Nullable |
| `lng` | float | Nullable |
| `description` | string | Nullable |
| `created_at` | timestamp | Auto-generated |
| `updated_at` | timestamp | Auto-generated |

> `geom` (PostGIS geometry) is excluded — it is auto-computed from `lat`/`lng` by a DB trigger.

#### Import CSV

Click **Nhập CSV** and select a `.csv` file. The file must have a header row matching the column names above.

- `id`, `created_at`, `updated_at` are ignored
- `lat` and `lng` are coerced to floats
- `hero_id` must be a valid UUID referencing an existing hero
- Empty cells are treated as `null`
- A result banner shows how many rows succeeded and how many failed

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

## Project Structure

```
admin/
├── src/
│   ├── components/
│   │   ├── heroes/       # HeroForm
│   │   └── shared/       # DataTable, Pagination, PageHeader, Badge, ConfirmDialog
│   ├── lib/
│   │   └── supabase.ts   # Supabase client
│   ├── pages/            # One file per route
│   └── types/
│       └── database.ts   # TypeScript interfaces mirroring DB schema
└── .env                  # Not committed — see .env.example
```
