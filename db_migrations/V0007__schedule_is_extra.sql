-- Признак подработки для смены в графике
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS is_extra BOOLEAN NOT NULL DEFAULT FALSE;
