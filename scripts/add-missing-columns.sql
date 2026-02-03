-- Add missing columns to keluarga table
ALTER TABLE keluarga 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT 0,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS last_modified_by INT,
ADD COLUMN IF NOT EXISTS conflict_resolution VARCHAR(50);

-- Add missing columns to penduduk table
ALTER TABLE penduduk 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT 0,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS last_modified_by INT,
ADD COLUMN IF NOT EXISTS conflict_resolution VARCHAR(50);

-- Add index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_keluarga_is_deleted ON keluarga(is_deleted, is_synced);
CREATE INDEX IF NOT EXISTS idx_penduduk_is_deleted ON penduduk(is_deleted, is_synced);

-- Verify columns were added
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'penduduk' AND TABLE_SCHEMA = DATABASE();
