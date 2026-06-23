-- Delete all duplicate rows except the most recent one with the API key
DELETE FROM system_settings 
WHERE id != 'c4d6b25d-7f0e-4784-b9d6-700ef9db59ee';

-- Add a singleton_lock column to ensure only one row can exist
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS singleton_lock boolean DEFAULT true;

-- Add a unique constraint on the singleton_lock column
ALTER TABLE system_settings 
ADD CONSTRAINT system_settings_singleton_lock_key UNIQUE (singleton_lock);

-- Add a check constraint to ensure the singleton_lock is always true
ALTER TABLE system_settings 
ADD CONSTRAINT system_settings_singleton_check CHECK (singleton_lock = true);