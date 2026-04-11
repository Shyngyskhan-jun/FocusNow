CREATE TABLE IF NOT EXISTS users (
  id                 SERIAL PRIMARY KEY,
  name               VARCHAR(100)        NOT NULL,
  email              VARCHAR(255) UNIQUE NOT NULL,
  password_hash      TEXT                NOT NULL,
  occupation         VARCHAR(50),
  bio                TEXT,
  daily_goal_minutes INT DEFAULT 120,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  user_id     INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        TEXT        NOT NULL,
  priority    VARCHAR(10) NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('high', 'medium', 'low')),
  completed   BOOLEAN     NOT NULL DEFAULT FALSE,
  deadline    DATE,
  mood_before VARCHAR(20) CHECK (mood_before IN ('tired', 'normal', 'energized')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tasks_set_updated_at'
  ) THEN
    CREATE TRIGGER tasks_set_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS task_steps (
  id      SERIAL PRIMARY KEY,
  task_id INT     NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text    TEXT    NOT NULL,
  done    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id               SERIAL PRIMARY KEY,
  user_id          INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duration_minutes INT         NOT NULL CHECK (duration_minutes > 0),
  mood_before      VARCHAR(20) CHECK (mood_before IN ('tired', 'normal', 'energized')),
  completed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_behavior_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(10) NOT NULL CHECK (action_type IN ('skip', 'quit', 'delay')),
  task_id     INT         REFERENCES tasks(id) ON DELETE SET NULL,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id
  ON tasks(user_id);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id
  ON focus_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_completed_at
  ON focus_sessions(user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_behavior_logs_user_id
  ON user_behavior_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_task_steps_task_id
  ON task_steps(task_id);