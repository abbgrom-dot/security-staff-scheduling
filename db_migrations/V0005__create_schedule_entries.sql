CREATE TABLE IF NOT EXISTS schedule_entries (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    kind VARCHAR(16) NOT NULL DEFAULT 'day',
    location_id INTEGER,
    post_id INTEGER,
    shift VARCHAR(32) NOT NULL DEFAULT '08:00 – 20:00',
    note TEXT DEFAULT '',
    UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_schedule_org_date ON schedule_entries (org_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_post ON schedule_entries (post_id);
