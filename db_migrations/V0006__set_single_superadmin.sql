-- Превращаем первого пользователя в единственного суперадмина admin@admin.ru / admin
UPDATE app_users
SET holding_id = 1,
    org_ids = '[1]'::jsonb,
    name = 'Администратор',
    email = 'admin@admin.ru',
    phone = '',
    avatar_initials = 'АД',
    role_ids = '[1]'::jsonb,
    is_active = TRUE,
    password_hash = 'pbkdf2_sha256$100000$56439f9d3a9b7b8f29266b24ae68831c$9acd58b7b801ba9f9c4aafc89aa4cf80b3da48864a38915c0c9d617480fd6a43'
WHERE id = 1;

-- Чистое имя холдинга и первой организации
UPDATE holdings SET name = 'Моя компания', inn = '' WHERE id = 1;

UPDATE organizations
SET name = 'Моя организация', short_name = 'Моя организация', inn = '', address = '', phone = '', license = ''
WHERE id = 1;
