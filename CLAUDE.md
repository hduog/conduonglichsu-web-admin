# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Con Đường Lịch Sử** ("Historical Road") — a gamified Vietnamese history education app. Users discover historical figures (heroes), explore streets named after them via GPS, complete challenges, and engage with a community feed.

This repository is a **specification-first repo** containing only:
- `api.swagger.yaml` — OpenAPI 3.0.3 end-user API spec
- `init.sql` — PostgreSQL 15+ database DDL (PostGIS, triggers, indexes)
- `database.md` — human-readable schema documentation
- `init.md` — admin dashboard project initialization guide

There is no runnable code here. The admin dashboard implementation lives in a separate directory.

## Architecture

### Roles
Three user roles enforced at DB level via enum: `user`, `admin`, `super_admin`.

### API Domains (api.swagger.yaml)
| Tag | Purpose |
|-----|---------|
| Auth | Register, login, Google OAuth, JWT refresh/logout |
| Users | Profile, badges, exploration history |
| Heroes | List/filter/search Vietnamese historical figures |
| Hero Events | Timeline events per hero (birth/battle/achievement/death/other) |
| Streets | GPS-based nearby lookup (PostGIS), hero-tagged streets |
| Explore | Featured content for home/explore tab |
| Challenges | GPS check-ins, cipher, race, quiz — with submissions and leaderboard |
| Community | Posts feed, likes, comments (cursor pagination) |
| Notifications | In-app notifications with read tracking |
| Home | Aggregated home screen data |

### Database (init.sql) — 16 Tables
**Auth:** `users`, `refresh_tokens`  
**Content:** `heroes` (full-text search via TSVECTOR+GIN), `hero_events`, `streets` (PostGIS GEOMETRY Point 4326)  
**Challenges:** `challenges`, `challenge_submissions` (unique per user per challenge)  
**Social:** `posts`, `post_media`, `post_likes`, `comments`, `comment_likes`  
**Gamification:** `badges`, `user_badges`, `exploration_history`, `notifications`

**Key DB patterns:**
- All PKs are UUIDs
- Cached counters (`like_count`, `comment_count`, `participant_count`) updated by triggers
- `updated_at` auto-maintained by triggers on all mutable tables
- `streets.geom` auto-computed from `lat`/`lng` via trigger
- `heroes.search_vector` auto-updated via trigger for full-text search
- Soft deletes not used; hard deletes with CASCADE

### Admin Dashboard Stack
Built as a separate Create React App (TypeScript) project using:
- **Supabase JS client** for all data access (no custom REST API)
- **React Router v6** with protected routes (admin/super_admin only)
- **shadcn/ui + Tailwind CSS** for UI
- **TanStack Table v8** for data grids
- **React Hook Form + Zod** for forms
- **Leaflet** for street GPS map visualization
- **Recharts** for analytics

See `init.md` for full setup instructions.

## Key Constraints
- `api.swagger.yaml` describes the **end-user mobile app API**, not the admin API
- Admin dashboard bypasses the REST API and queries Supabase directly
- PostGIS spatial queries (nearby streets) require `supabase.rpc()` for stored procedures
- File uploads (hero images, submission photos) go through Supabase Storage
