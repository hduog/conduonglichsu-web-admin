# Database Schema — Con Đường Lịch Sử

> **RDBMS:** PostgreSQL 15+ với extension **PostGIS** (bắt buộc cho tính năng GPS nearby).
> **Convention:** tên bảng `snake_case` số nhiều, khoá chính `id` kiểu `UUID`, timestamps `created_at` / `updated_at` trên mọi bảng.

---

## Mục lục

1. [users](#1-users)
2. [refresh_tokens](#2-refresh_tokens)
3. [heroes](#3-heroes)
4. [hero_events](#4-hero_events)
5. [streets](#5-streets)
6. [challenges](#6-challenges)
7. [challenge_submissions](#7-challenge_submissions)
8. [posts](#8-posts)
9. [post_media](#9-post_media)
10. [post_likes](#10-post_likes)
11. [comments](#11-comments)
12. [comment_likes](#12-comment_likes)
13. [badges](#13-badges)
14. [user_badges](#14-user_badges)
15. [exploration_history](#15-exploration_history)
16. [notifications](#16-notifications)
17. [Quan hệ tổng thể (ERD)](#quan-hệ-tổng-thể-erd)
18. [Index & Constraint quan trọng](#index--constraint-quan-trọng)

---

## 1. `users`

Lưu thông tin tài khoản người dùng.

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `email` | VARCHAR(255) | NO | — | Email đăng nhập, UNIQUE |
| `password_hash` | VARCHAR(255) | YES | NULL | NULL nếu chỉ dùng OAuth |
| `name` | VARCHAR(100) | NO | — | Tên hiển thị |
| `avatar_url` | TEXT | YES | NULL | URL ảnh đại diện (Cloudinary) |
| `bio` | TEXT | YES | NULL | Giới thiệu bản thân |
| `role` | VARCHAR(20) | NO | `'user'` | `user` / `admin` / `super_admin` |
| `points` | INTEGER | NO | `0` | Tổng điểm tích luỹ |
| `level` | INTEGER | NO | `1` | Cấp độ (tính từ points) |
| `streak` | INTEGER | NO | `0` | Số ngày khám phá liên tiếp |
| `streets_explored` | INTEGER | NO | `0` | Tổng đường phố đã ghé thăm |
| `google_id` | VARCHAR(255) | YES | NULL | Google OAuth subject ID, UNIQUE |
| `is_active` | BOOLEAN | NO | `true` | Tài khoản có bị khóa không |
| `fcm_token` | TEXT | YES | NULL | Firebase Cloud Messaging token |
| `last_active_at` | TIMESTAMPTZ | YES | NULL | Lần cuối online |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | — |

**Quan hệ:**
- 1 user → nhiều `refresh_tokens`
- 1 user → nhiều `posts`
- 1 user → nhiều `challenge_submissions`
- 1 user → nhiều `user_badges`
- 1 user → nhiều `exploration_history`
- 1 user → nhiều `notifications`
- 1 user → nhiều `post_likes`, `comment_likes`

---

## 2. `refresh_tokens`

Lưu refresh token để hỗ trợ luồng làm mới access token và thu hồi phiên.

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `user_id` | UUID | NO | — | FK → `users.id` |
| `token` | TEXT | NO | — | Chuỗi token (hash SHA-256), UNIQUE |
| `expires_at` | TIMESTAMPTZ | NO | — | Hạn sử dụng (~30 ngày) |
| `revoked_at` | TIMESTAMPTZ | YES | NULL | NULL = còn hợp lệ |
| `user_agent` | TEXT | YES | NULL | Thông tin thiết bị |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |

**Quan hệ:** nhiều `refresh_tokens` → 1 `users`

---

## 3. `heroes`

Thông tin danh nhân lịch sử Việt Nam.

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `full_name` | VARCHAR(150) | NO | — | Tên đầy đủ (vd: Trần Hưng Đạo) |
| `alias_name` | VARCHAR(150) | YES | NULL | Tên hiệu (vd: Hưng Đạo Vương) |
| `birth_year` | SMALLINT | YES | NULL | Năm sinh (âm lịch hoặc dương lịch) |
| `death_year` | SMALLINT | YES | NULL | Năm mất |
| `province` | VARCHAR(100) | NO | — | Quê quán (tỉnh/thành phố) |
| `era` | VARCHAR(30) | NO | — | `hung_vuong` / `bac_thuoc` / `ly_tran` / `le` / `nguyen` / `can_dai` |
| `category` | VARCHAR(30) | NO | — | `military` / `culture` / `science` / `politics` |
| `bio_short` | VARCHAR(500) | NO | — | Tiểu sử ngắn (hiển thị trên card) |
| `bio_full` | TEXT | YES | NULL | Tiểu sử đầy đủ |
| `avatar_url` | TEXT | YES | NULL | URL ảnh chân dung |
| `quote` | TEXT | YES | NULL | Câu nói nổi tiếng |
| `search_vector` | TSVECTOR | YES | NULL | Full-text search vector (PostgreSQL) |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | — |

**Quan hệ:**
- 1 hero → nhiều `hero_events`
- 1 hero → nhiều `streets` (đường mang tên danh nhân)
- 1 hero → nhiều `challenges` (thử thách liên quan)

---

## 4. `hero_events`

Dòng thời gian sự kiện lịch sử của một danh nhân.

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `hero_id` | UUID | NO | — | FK → `heroes.id` (CASCADE DELETE) |
| `title` | VARCHAR(200) | NO | — | Tiêu đề sự kiện |
| `description` | TEXT | NO | — | Mô tả chi tiết |
| `year` | INTEGER | NO | — | Năm xảy ra sự kiện (âm) |
| `event_type` | VARCHAR(20) | NO | — | `birth` / `battle` / `achievement` / `death` / `other` |
| `image_url` | TEXT | YES | NULL | Ảnh minh hoạ sự kiện |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |

**Quan hệ:** nhiều `hero_events` → 1 `heroes`

---

## 5. `streets`

Tên đường phố và liên kết danh nhân. Dùng PostGIS cho tính năng GPS.

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `name` | VARCHAR(200) | NO | — | Tên đường (vd: Phố Trần Hưng Đạo) |
| `city` | VARCHAR(100) | NO | — | Thành phố |
| `province` | VARCHAR(100) | NO | — | Tỉnh/Thành phố |
| `hero_id` | UUID | NO | — | FK → `heroes.id` |
| `lat` | DOUBLE PRECISION | YES | NULL | Vĩ độ trung tâm đường |
| `lng` | DOUBLE PRECISION | YES | NULL | Kinh độ trung tâm đường |
| `geom` | GEOMETRY(Point, 4326) | YES | NULL | **PostGIS** point geometry (từ lat/lng) |
| `description` | TEXT | YES | NULL | Mô tả thêm về con đường |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | — |

**Quan hệ:** nhiều `streets` → 1 `heroes`

> **Note:** Cột `geom` được tạo tự động bằng trigger:
> `geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)`
> Index không gian: `CREATE INDEX idx_streets_geom ON streets USING GIST(geom);`

---

## 6. `challenges`

Thử thách check-in, cipher, quiz, race cho người dùng.

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `title` | VARCHAR(200) | NO | — | Tiêu đề thử thách |
| `description` | TEXT | NO | — | Mô tả nội dung |
| `type` | VARCHAR(20) | NO | — | `checkin` / `cipher` / `race` / `quiz` |
| `target_lat` | DOUBLE PRECISION | YES | NULL | Vĩ độ điểm đích (cho checkin) |
| `target_lng` | DOUBLE PRECISION | YES | NULL | Kinh độ điểm đích |
| `target_radius` | DOUBLE PRECISION | YES | NULL | Bán kính hợp lệ (mét) |
| `reward_points` | INTEGER | NO | `0` | Điểm thưởng khi hoàn thành |
| `reward_badge_id` | UUID | YES | NULL | FK → `badges.id` (huy hiệu thưởng) |
| `hero_id` | UUID | YES | NULL | FK → `heroes.id` (danh nhân liên quan) |
| `image_url` | TEXT | YES | NULL | Ảnh bìa thử thách |
| `start_at` | TIMESTAMPTZ | NO | — | Thời điểm bắt đầu |
| `end_at` | TIMESTAMPTZ | NO | — | Thời điểm kết thúc |
| `status` | VARCHAR(20) | NO | `'upcoming'` | `active` / `upcoming` / `ended` |
| `participant_count` | INTEGER | NO | `0` | Đếm số người tham gia (cache) |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | — |

**Quan hệ:**
- 1 challenge → nhiều `challenge_submissions`
- nhiều `challenges` → 1 `badges` (reward)
- nhiều `challenges` → 1 `heroes`

---

## 7. `challenge_submissions`

Bài nộp của người dùng cho mỗi thử thách.

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `challenge_id` | UUID | NO | — | FK → `challenges.id` |
| `user_id` | UUID | NO | — | FK → `users.id` |
| `photo_url` | TEXT | YES | NULL | URL ảnh check-in (Cloudinary) |
| `lat` | DOUBLE PRECISION | YES | NULL | Vĩ độ GPS lúc nộp bài |
| `lng` | DOUBLE PRECISION | YES | NULL | Kinh độ GPS lúc nộp bài |
| `distance_meters` | DOUBLE PRECISION | YES | NULL | Khoảng cách tính được đến target |
| `submitted_at` | TIMESTAMPTZ | NO | `NOW()` | Thời điểm nộp bài |
| `status` | VARCHAR(20) | NO | `'pending'` | `pending` / `approved` / `rejected` |
| `rejection_reason` | TEXT | YES | NULL | Lý do từ chối (nếu có) |
| `reviewed_at` | TIMESTAMPTZ | YES | NULL | Thời điểm duyệt |
| `reviewed_by` | UUID | YES | NULL | FK → `users.id` (admin duyệt) |

**Quan hệ:**
- nhiều `challenge_submissions` → 1 `challenges`
- nhiều `challenge_submissions` → 1 `users`

> **Constraint:** `UNIQUE (challenge_id, user_id)` — mỗi user chỉ nộp 1 lần / thử thách.

---

## 8. `posts`

Bài đăng trong cộng đồng diễn đàn.

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `user_id` | UUID | NO | — | FK → `users.id` |
| `content` | VARCHAR(500) | NO | — | Nội dung bài đăng |
| `hero_tag` | VARCHAR(150) | YES | NULL | Tên danh nhân được gắn thẻ |
| `street_tag` | VARCHAR(200) | YES | NULL | Tên đường phố được gắn thẻ |
| `lat` | DOUBLE PRECISION | YES | NULL | Vĩ độ vị trí đăng bài |
| `lng` | DOUBLE PRECISION | YES | NULL | Kinh độ vị trí đăng bài |
| `like_count` | INTEGER | NO | `0` | Số lượt thích (cache, đồng bộ với `post_likes`) |
| `comment_count` | INTEGER | NO | `0` | Số bình luận (cache) |
| `is_hidden` | BOOLEAN | NO | `false` | Admin ẩn bài vi phạm |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | — |

**Quan hệ:**
- nhiều `posts` → 1 `users`
- 1 post → nhiều `post_media`
- 1 post → nhiều `post_likes`
- 1 post → nhiều `comments`

---

## 9. `post_media`

Ảnh/video đính kèm bài đăng (tách bảng để hỗ trợ nhiều media).

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `post_id` | UUID | NO | — | FK → `posts.id` (CASCADE DELETE) |
| `url` | TEXT | NO | — | URL Cloudinary |
| `media_type` | VARCHAR(10) | NO | `'image'` | `image` / `video` |
| `order_index` | SMALLINT | NO | `0` | Thứ tự hiển thị |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |

**Quan hệ:** nhiều `post_media` → 1 `posts`

---

## 10. `post_likes`

Lượt thích bài đăng (bảng junction).

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `post_id` | UUID | NO | — | FK → `posts.id` (CASCADE DELETE) |
| `user_id` | UUID | NO | — | FK → `users.id` (CASCADE DELETE) |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |

> **Constraint:** `UNIQUE (post_id, user_id)`

---

## 11. `comments`

Bình luận trên bài đăng.

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `post_id` | UUID | NO | — | FK → `posts.id` (CASCADE DELETE) |
| `user_id` | UUID | NO | — | FK → `users.id` |
| `content` | VARCHAR(300) | NO | — | Nội dung bình luận |
| `like_count` | INTEGER | NO | `0` | Số lượt thích bình luận (cache) |
| `is_hidden` | BOOLEAN | NO | `false` | Admin ẩn bình luận |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | — |

**Quan hệ:**
- nhiều `comments` → 1 `posts`
- nhiều `comments` → 1 `users`
- 1 comment → nhiều `comment_likes`

---

## 12. `comment_likes`

Lượt thích bình luận.

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `comment_id` | UUID | NO | — | FK → `comments.id` (CASCADE DELETE) |
| `user_id` | UUID | NO | — | FK → `users.id` (CASCADE DELETE) |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |

> **Constraint:** `UNIQUE (comment_id, user_id)`

---

## 13. `badges`

Danh mục huy hiệu trong hệ thống (định nghĩa tĩnh, admin quản lý).

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `code` | VARCHAR(50) | NO | — | Mã định danh, UNIQUE (vd: `first_hero`) |
| `name` | VARCHAR(100) | NO | — | Tên hiển thị |
| `description` | TEXT | NO | — | Điều kiện để nhận huy hiệu |
| `icon_url` | TEXT | NO | — | URL icon huy hiệu |
| `rarity` | VARCHAR(20) | NO | `'common'` | `common` / `rare` / `epic` / `legendary` |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |

**Quan hệ:**
- 1 badge → nhiều `user_badges`
- 1 badge → nhiều `challenges` (dùng làm reward)

---

## 14. `user_badges`

Bảng junction: huy hiệu người dùng đã nhận được.

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `user_id` | UUID | NO | — | FK → `users.id` (CASCADE DELETE) |
| `badge_id` | UUID | NO | — | FK → `badges.id` |
| `source` | VARCHAR(30) | YES | NULL | Nguồn nhận: `challenge` / `system` / `manual` |
| `source_id` | UUID | YES | NULL | ID của entity nguồn (vd: challenge_submission_id) |
| `earned_at` | TIMESTAMPTZ | NO | `NOW()` | Thời điểm nhận huy hiệu |

> **Constraint:** `UNIQUE (user_id, badge_id)` — mỗi user chỉ nhận mỗi huy hiệu 1 lần.

---

## 15. `exploration_history`

Lịch sử khám phá của người dùng (đường phố & danh nhân đã ghé thăm).

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `user_id` | UUID | NO | — | FK → `users.id` (CASCADE DELETE) |
| `type` | VARCHAR(10) | NO | — | `street` / `hero` |
| `reference_id` | UUID | NO | — | ID của street hoặc hero |
| `title` | VARCHAR(200) | NO | — | Tên đường / danh nhân (denormalized) |
| `subtitle` | VARCHAR(200) | YES | NULL | Thông tin phụ (quận, thành phố...) |
| `visited_at` | TIMESTAMPTZ | NO | `NOW()` | Thời điểm khám phá |

**Quan hệ:** nhiều `exploration_history` → 1 `users`

> **Note:** `reference_id` không dùng FK vì trỏ đến 2 bảng khác nhau (`streets` hoặc `heroes`). Thay vào đó dùng cột `type` để phân biệt.

---

## 16. `notifications`

Thông báo trong app gửi đến người dùng.

| Cột | Kiểu | Nullable | Mặc định | Mô tả |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Khoá chính |
| `user_id` | UUID | NO | — | FK → `users.id` (CASCADE DELETE) |
| `type` | VARCHAR(20) | NO | — | `badge` / `challenge` / `hero` / `community` / `location` / `system` |
| `title` | VARCHAR(200) | NO | — | Tiêu đề thông báo |
| `body` | TEXT | NO | — | Nội dung thông báo |
| `related_id` | UUID | YES | NULL | ID entity liên quan (badge, challenge, post...) |
| `related_type` | VARCHAR(30) | YES | NULL | Loại entity: `badge` / `challenge` / `post` ... |
| `is_read` | BOOLEAN | NO | `false` | Đã đọc chưa |
| `read_at` | TIMESTAMPTZ | YES | NULL | Thời điểm đọc |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | — |

**Quan hệ:** nhiều `notifications` → 1 `users`

---

## Quan hệ tổng thể (ERD)

```
users
├──< refresh_tokens          (1:N, user_id)
├──< posts                   (1:N, user_id)
│    ├──< post_media         (1:N, post_id)
│    ├──< post_likes         (1:N, post_id) >──< users
│    └──< comments           (1:N, post_id)
│         └──< comment_likes (1:N, comment_id) >──< users
├──< challenge_submissions   (1:N, user_id)
├──< user_badges             (1:N, user_id) >──< badges
├──< exploration_history     (1:N, user_id)
└──< notifications           (1:N, user_id)

heroes
├──< hero_events             (1:N, hero_id)
├──< streets                 (1:N, hero_id)
└──< challenges              (1:N, hero_id)
     ├──< challenge_submissions (1:N, challenge_id)
     └──> badges             (N:1, reward_badge_id)
```

---

## Index & Constraint quan trọng

```sql
-- Tìm kiếm full-text danh nhân
CREATE INDEX idx_heroes_search ON heroes USING GIN(search_vector);
-- Trigger cập nhật search_vector khi INSERT/UPDATE heroes
CREATE TRIGGER heroes_search_update BEFORE INSERT OR UPDATE ON heroes
  FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.vietnamese', full_name, alias_name, bio_short);

-- GPS nearby street (PostGIS)
CREATE INDEX idx_streets_geom ON streets USING GIST(geom);

-- Feed bài đăng (sắp xếp theo thời gian)
CREATE INDEX idx_posts_created ON posts (created_at DESC);
CREATE INDEX idx_posts_user ON posts (user_id, created_at DESC);

-- Like / Unlike nhanh
CREATE UNIQUE INDEX idx_post_likes_unique ON post_likes (post_id, user_id);
CREATE UNIQUE INDEX idx_comment_likes_unique ON comment_likes (comment_id, user_id);

-- Challenge: mỗi user chỉ nộp 1 lần
CREATE UNIQUE INDEX idx_submissions_unique ON challenge_submissions (challenge_id, user_id);

-- Badge: mỗi user chỉ nhận 1 lần
CREATE UNIQUE INDEX idx_user_badges_unique ON user_badges (user_id, badge_id);

-- Notifications: đọc nhanh theo user
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read) WHERE is_read = false;

-- Refresh token: lookup nhanh
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id, revoked_at);
```

---

## Ghi chú thiết kế

| Quyết định | Lý do |
|---|---|
| UUID cho PK | Tránh lộ số lượng bản ghi, dễ merge data giữa môi trường |
| PostGIS extension | Bắt buộc cho `ST_DWithin` (nearby streets) — PostgreSQL thuần không đủ |
| Cache counter (`like_count`, `comment_count`) | Tránh `COUNT(*)` mỗi request; đồng bộ qua trigger hoặc BullMQ job |
| `hero_tag` / `street_tag` là VARCHAR | Không FK cứng để linh hoạt khi user gõ tay; validate soft ở application layer |
| `exploration_history.reference_id` không FK | Trỏ polymorphic (street hoặc hero); dùng `type` để phân biệt |
| `search_vector` TSVECTOR | Full-text search tiếng Việt; cần config `pg_catalog.vietnamese` dictionary |
| Cloudinary cho media | CDN + auto-resize + WebP conversion; không lưu file trên server |
