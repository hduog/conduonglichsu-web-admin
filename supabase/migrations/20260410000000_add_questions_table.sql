-- =============================================================
-- Migration: Add questions table and challenge_questions junction
-- Date: 2026-04-10
-- Description: Supports quiz-type challenges with N-N relationship
--              between challenges and questions.
-- =============================================================

-- 1. questions table
CREATE TABLE questions (
    id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content     TEXT         NOT NULL,
    type_answer VARCHAR(20)  NOT NULL
                    CHECK (type_answer IN ('normal_text', 'checkbox')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2. question_options — choices for checkbox-type questions
--    Ignored for normal_text questions.
CREATE TABLE question_options (
    id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID         NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    label       TEXT         NOT NULL,
    is_correct  BOOLEAN      NOT NULL DEFAULT false,
    sort_order  SMALLINT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3. challenge_questions — N-N junction between challenges and questions
--    Only meaningful when challenge.type = 'quiz'.
CREATE TABLE challenge_questions (
    challenge_id UUID     NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    question_id  UUID     NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    sort_order   SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (challenge_id, question_id)
);

-- 4. Indexes
CREATE INDEX idx_question_options_question ON question_options (question_id);
CREATE INDEX idx_challenge_questions_challenge ON challenge_questions (challenge_id);
CREATE INDEX idx_challenge_questions_question  ON challenge_questions (question_id);

-- 5. updated_at trigger for questions
CREATE TRIGGER questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
