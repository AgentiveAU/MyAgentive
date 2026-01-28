-- Add transcription column to media_files table
ALTER TABLE media_files ADD COLUMN transcription TEXT;

-- Index for finding transcribed files
CREATE INDEX idx_media_transcription ON media_files(transcription) WHERE transcription IS NOT NULL;
