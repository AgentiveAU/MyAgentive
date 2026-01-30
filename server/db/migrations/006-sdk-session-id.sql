-- Add SDK session ID column for session resume functionality
-- This stores the Claude Agent SDK's session_id for context restoration
ALTER TABLE sessions ADD COLUMN sdk_session_id TEXT;

-- Index for quick lookups when resuming sessions
CREATE INDEX idx_sessions_sdk_session ON sessions(sdk_session_id) WHERE sdk_session_id IS NOT NULL;
