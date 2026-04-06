-- =============================================================
-- Con Đường Lịch Sử — Database Initialization Script
-- PostgreSQL 15+ với PostGIS extension
-- Generated from: docs/database.md
-- =============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "postgis";     -- geometry, ST_DWithin, GIST

-- =============================================================
-- 1. users
-- =============================================================
CREATE TABLE users (
    id               UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email            VARCHAR(255) NOT NULL UNIQUE,
    password_hash    VARCHAR(255),
    name             VARCHAR(100) NOT NULL,
    avatar_url       TEXT,
    bio              TEXT,
    role             VARCHAR(20)  NOT NULL DEFAULT 'user'
                         CHECK (role IN ('user', 'admin', 'super_admin')),
    points           INTEGER      NOT NULL DEFAULT 0,
    level            INTEGER      NOT NULL DEFAULT 1,
    streak           INTEGER      NOT NULL DEFAULT 0,
    streets_explored INTEGER      NOT NULL DEFAULT 0,
    google_id        VARCHAR(255) UNIQUE,
    is_active        BOOLEAN      NOT NULL DEFAULT true,
    fcm_token        TEXT,
    last_active_at   TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 2. refresh_tokens
-- =============================================================
CREATE TABLE refresh_tokens (
    id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 3. heroes
-- =============================================================
CREATE TABLE heroes (
    id            UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name     VARCHAR(150) NOT NULL,
    alias_name    VARCHAR(150),
    birth_year    SMALLINT,
    death_year    SMALLINT,
    province      VARCHAR(100) NOT NULL,
    era           VARCHAR(30)  NOT NULL
                      CHECK (era IN ('hung_vuong', 'bac_thuoc', 'ly_tran', 'le', 'nguyen', 'can_dai')),
    category      VARCHAR(30)  NOT NULL
                      CHECK (category IN ('military', 'culture', 'science', 'politics')),
    bio_short     VARCHAR(500) NOT NULL,
    bio_full      TEXT,
    avatar_url    TEXT,
    quote         TEXT,
    search_vector TSVECTOR,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 4. hero_events
-- =============================================================
CREATE TABLE hero_events (
    id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    hero_id     UUID         NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT         NOT NULL,
    year        INTEGER      NOT NULL,
    event_type  VARCHAR(20)  NOT NULL
                    CHECK (event_type IN ('birth', 'battle', 'achievement', 'death', 'other')),
    image_url   TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 5. streets
-- =============================================================
CREATE TABLE streets (
    id          UUID                    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name        VARCHAR(200)            NOT NULL,
    city        VARCHAR(100)            NOT NULL,
    province    VARCHAR(100)            NOT NULL,
    hero_id     UUID                    NOT NULL REFERENCES heroes(id),
    lat         DOUBLE PRECISION,
    lng         DOUBLE PRECISION,
    geom        GEOMETRY(Point, 4326),
    description TEXT,
    created_at  TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- Trigger: tự động tính geom từ lat/lng
CREATE OR REPLACE FUNCTION streets_set_geom()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
        NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER streets_geom_update
    BEFORE INSERT OR UPDATE OF lat, lng ON streets
    FOR EACH ROW EXECUTE FUNCTION streets_set_geom();

-- =============================================================
-- 13. badges  (khai báo trước challenges vì challenges FK → badges)
-- =============================================================
CREATE TABLE badges (
    id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    description TEXT         NOT NULL,
    icon_url    TEXT         NOT NULL,
    rarity      VARCHAR(20)  NOT NULL DEFAULT 'common'
                    CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 6. challenges
-- =============================================================
CREATE TABLE challenges (
    id                UUID             NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title             VARCHAR(200)     NOT NULL,
    description       TEXT             NOT NULL,
    type              VARCHAR(20)      NOT NULL
                          CHECK (type IN ('checkin', 'cipher', 'race', 'quiz')),
    target_lat        DOUBLE PRECISION,
    target_lng        DOUBLE PRECISION,
    target_radius     DOUBLE PRECISION,
    reward_points     INTEGER          NOT NULL DEFAULT 0,
    reward_badge_id   UUID             REFERENCES badges(id),
    hero_id           UUID             REFERENCES heroes(id),
    image_url         TEXT,
    start_at          TIMESTAMPTZ      NOT NULL,
    end_at            TIMESTAMPTZ      NOT NULL,
    status            VARCHAR(20)      NOT NULL DEFAULT 'upcoming'
                          CHECK (status IN ('active', 'upcoming', 'ended')),
    participant_count INTEGER          NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 7. challenge_submissions
-- =============================================================
CREATE TABLE challenge_submissions (
    id               UUID             NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id     UUID             NOT NULL REFERENCES challenges(id),
    user_id          UUID             NOT NULL REFERENCES users(id),
    photo_url        TEXT,
    lat              DOUBLE PRECISION,
    lng              DOUBLE PRECISION,
    distance_meters  DOUBLE PRECISION,
    submitted_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    status           VARCHAR(20)      NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_at      TIMESTAMPTZ,
    reviewed_by      UUID             REFERENCES users(id),
    UNIQUE (challenge_id, user_id)
);

-- =============================================================
-- 8. posts
-- =============================================================
CREATE TABLE posts (
    id            UUID             NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID             NOT NULL REFERENCES users(id),
    content       VARCHAR(500)     NOT NULL,
    hero_tag      VARCHAR(150),
    street_tag    VARCHAR(200),
    lat           DOUBLE PRECISION,
    lng           DOUBLE PRECISION,
    like_count    INTEGER          NOT NULL DEFAULT 0,
    comment_count INTEGER          NOT NULL DEFAULT 0,
    is_hidden     BOOLEAN          NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 9. post_media
-- =============================================================
CREATE TABLE post_media (
    id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id     UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    url         TEXT        NOT NULL,
    media_type  VARCHAR(10) NOT NULL DEFAULT 'image'
                    CHECK (media_type IN ('image', 'video')),
    order_index SMALLINT    NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 10. post_likes
-- =============================================================
CREATE TABLE post_likes (
    id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

-- =============================================================
-- 11. comments
-- =============================================================
CREATE TABLE comments (
    id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id),
    content    VARCHAR(300) NOT NULL,
    like_count INTEGER     NOT NULL DEFAULT 0,
    is_hidden  BOOLEAN     NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 12. comment_likes
-- =============================================================
CREATE TABLE comment_likes (
    id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID        NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (comment_id, user_id)
);

-- =============================================================
-- 14. user_badges
-- =============================================================
CREATE TABLE user_badges (
    id        UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id  UUID        NOT NULL REFERENCES badges(id),
    source    VARCHAR(30) CHECK (source IN ('challenge', 'system', 'manual')),
    source_id UUID,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, badge_id)
);

-- =============================================================
-- 15. exploration_history
-- =============================================================
CREATE TABLE exploration_history (
    id           UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(10)  NOT NULL CHECK (type IN ('street', 'hero')),
    reference_id UUID         NOT NULL,   -- polymorphic: streets.id hoặc heroes.id
    title        VARCHAR(200) NOT NULL,
    subtitle     VARCHAR(200),
    visited_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 16. notifications
-- =============================================================
CREATE TABLE notifications (
    id           UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(20)  NOT NULL
                     CHECK (type IN ('badge', 'challenge', 'hero', 'community', 'location', 'system')),
    title        VARCHAR(200) NOT NULL,
    body         TEXT         NOT NULL,
    related_id   UUID,
    related_type VARCHAR(30),
    is_read      BOOLEAN      NOT NULL DEFAULT false,
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================
-- INDEXES
-- =============================================================

-- Full-text search danh nhân (GIN)
CREATE INDEX idx_heroes_search ON heroes USING GIN(search_vector);

-- Trigger cập nhật search_vector khi INSERT/UPDATE heroes
CREATE TRIGGER heroes_search_update
    BEFORE INSERT OR UPDATE ON heroes
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.simple', full_name, alias_name, bio_short);

-- GPS nearby street (PostGIS GIST)
CREATE INDEX idx_streets_geom ON streets USING GIST(geom);

-- Feed bài đăng
CREATE INDEX idx_posts_created ON posts (created_at DESC);
CREATE INDEX idx_posts_user    ON posts (user_id, created_at DESC);

-- Like / Unlike nhanh (đã có UNIQUE constraint, tạo thêm index rõ tên)
CREATE UNIQUE INDEX idx_post_likes_unique     ON post_likes     (post_id,    user_id);
CREATE UNIQUE INDEX idx_comment_likes_unique  ON comment_likes  (comment_id, user_id);

-- Challenge: mỗi user chỉ nộp 1 lần
CREATE UNIQUE INDEX idx_submissions_unique ON challenge_submissions (challenge_id, user_id);

-- Badge: mỗi user chỉ nhận 1 lần
CREATE UNIQUE INDEX idx_user_badges_unique ON user_badges (user_id, badge_id);

-- Notifications: đọc nhanh theo user
CREATE INDEX idx_notifications_user   ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read) WHERE is_read = false;

-- Refresh token: lookup nhanh
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id, revoked_at);

-- Hero events: sắp xếp theo năm
CREATE INDEX idx_hero_events_hero ON hero_events (hero_id, year);

-- Streets: lookup theo hero
CREATE INDEX idx_streets_hero ON streets (hero_id);

-- Challenges: lọc theo status và thời gian
CREATE INDEX idx_challenges_status  ON challenges (status, start_at, end_at);
CREATE INDEX idx_challenges_hero    ON challenges (hero_id);

-- =============================================================
-- AUTO-UPDATE updated_at TRIGGER (dùng chung cho mọi bảng cần)
-- =============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at          BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER heroes_updated_at         BEFORE UPDATE ON heroes         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER streets_updated_at        BEFORE UPDATE ON streets        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER challenges_updated_at     BEFORE UPDATE ON challenges     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER posts_updated_at          BEFORE UPDATE ON posts          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER comments_updated_at       BEFORE UPDATE ON comments       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
