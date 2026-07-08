-- ─── Schema: SecureOps ────────────────────────────────────────────────────────

CREATE TABLE holdings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    inn VARCHAR(20) NOT NULL,
    logo TEXT
);

CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    holding_id INTEGER NOT NULL REFERENCES holdings(id),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100) NOT NULL,
    inn VARCHAR(20) NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    phone VARCHAR(50) NOT NULL DEFAULT '',
    license VARCHAR(255) NOT NULL DEFAULT '',
    color VARCHAR(20) NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    org_id INTEGER REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE app_users (
    id SERIAL PRIMARY KEY,
    holding_id INTEGER NOT NULL REFERENCES holdings(id),
    org_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL DEFAULT '',
    avatar_initials VARCHAR(10) NOT NULL DEFAULT '',
    role_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login VARCHAR(30) NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT ''
);

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    type VARCHAR(30) NOT NULL DEFAULT 'office',
    posts INTEGER NOT NULL DEFAULT 0,
    contact VARCHAR(50) NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    hourly_rate INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    rank VARCHAR(100) NOT NULL DEFAULT 'Охранник',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    location VARCHAR(255) NOT NULL DEFAULT '—',
    shift VARCHAR(100) NOT NULL DEFAULT '',
    phone VARCHAR(50) NOT NULL DEFAULT '',
    hire_date VARCHAR(30) NOT NULL DEFAULT '',
    years_exp INTEGER NOT NULL DEFAULT 0,
    seniority_bonus INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    extra_shift_rate NUMERIC(4,2) NOT NULL DEFAULT 1.5,
    periodic_check_date VARCHAR(30) NOT NULL DEFAULT '',
    med_check_date VARCHAR(30) NOT NULL DEFAULT ''
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    location_id INTEGER NOT NULL REFERENCES locations(id),
    officer_id INTEGER REFERENCES employees(id),
    time VARCHAR(50) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'vacant',
    is_extra_shift BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_at VARCHAR(40),
    confirmed_by VARCHAR(255),
    actual_start_time VARCHAR(20),
    actual_hours NUMERIC(5,2),
    closed_at VARCHAR(40),
    close_reason VARCHAR(20),
    close_note TEXT
);

CREATE TABLE fine_reasons (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(id),
    label VARCHAR(255) NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(255) NOT NULL DEFAULT ''
);

CREATE TABLE fines (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES organizations(id),
    date VARCHAR(30) NOT NULL DEFAULT '',
    employee_id INTEGER REFERENCES employees(id),
    post_id INTEGER REFERENCES posts(id),
    reason_id INTEGER REFERENCES fine_reasons(id),
    note TEXT NOT NULL DEFAULT '',
    amount INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_locations_org ON locations(org_id);
CREATE INDEX idx_employees_org ON employees(org_id);
CREATE INDEX idx_posts_org ON posts(org_id);
CREATE INDEX idx_fine_reasons_org ON fine_reasons(org_id);
CREATE INDEX idx_fines_org ON fines(org_id);
