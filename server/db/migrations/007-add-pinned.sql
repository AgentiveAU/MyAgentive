-- Add pinned column to sessions table
ALTER TABLE sessions ADD COLUMN pinned INTEGER DEFAULT 0;

-- Create index for efficient sorting (pinned first, then by updated_at)
CREATE INDEX idx_sessions_pinned ON sessions(pinned DESC, updated_at DESC);
