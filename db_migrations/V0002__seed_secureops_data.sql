-- ─── Seed: SecureOps ──────────────────────────────────────────────────────────

INSERT INTO holdings (id, name, inn) VALUES
(1, 'ГК «СекьюрГрупп»', '7700000001');

INSERT INTO organizations (id, holding_id, name, short_name, inn, address, phone, license, color) VALUES
(1, 1, 'ООО «Охранная Группа Центр»', 'ОГ Центр', '7701234567', 'ул. Ленина, 1, Москва', '+7 800 100-00-01', 'ЧО-123456 / до 31.12.2027', '#6366f1'),
(2, 1, 'ООО «Охранная Группа Север»', 'ОГ Север', '7702345678', 'пр. Победы, 5, Санкт-Петербург', '+7 800 100-00-02', 'ЧО-234567 / до 30.06.2026', '#0ea5e9'),
(3, 1, 'ООО «Охранная Группа Юг»', 'ОГ Юг', '7703456789', 'ул. Красная, 10, Краснодар', '+7 800 100-00-03', 'ЧО-345678 / до 15.03.2028', '#10b981');

INSERT INTO roles (id, org_id, name, description, permissions, is_system) VALUES
(1, NULL, 'Суперадминистратор', 'Полный доступ ко всем организациям холдинга', '["dashboard:view","objects:view","objects:edit","placements:view","placements:edit","employees:view","employees:edit","fines:view","fines:edit","reports:view","schedule:view","schedule:edit","export:use","analytics:view","users:view","users:edit","roles:view","roles:edit","settings:edit","holding:view"]'::jsonb, TRUE),
(2, NULL, 'Директор организации', 'Полный доступ к своей организации, без управления холдингом', '["dashboard:view","objects:view","objects:edit","placements:view","placements:edit","employees:view","employees:edit","fines:view","fines:edit","reports:view","schedule:view","schedule:edit","export:use","analytics:view","users:view","users:edit","roles:view","settings:edit"]'::jsonb, TRUE),
(3, NULL, 'Диспетчер', 'Управление расстановками и просмотр данных', '["dashboard:view","objects:view","placements:view","placements:edit","employees:view","fines:view","fines:edit","reports:view","schedule:view","analytics:view"]'::jsonb, TRUE),
(4, NULL, 'Аналитик', 'Только просмотр: отчёты, аналитика, график', '["dashboard:view","objects:view","employees:view","fines:view","reports:view","schedule:view","analytics:view","export:use"]'::jsonb, TRUE);

INSERT INTO app_users (id, holding_id, org_ids, name, email, phone, avatar_initials, role_ids, is_active, last_login, password_hash) VALUES
(1, 1, '[1,2,3]'::jsonb, 'Алексей Демидов', 'admin@securgroup.ru', '+7 900 000-00-00', 'АД', '[1]'::jsonb, TRUE, '2026-05-06', ''),
(2, 1, '[1]'::jsonb, 'Марина Орлова', 'orlova@og-center.ru', '+7 900 001-00-01', 'МО', '[2]'::jsonb, TRUE, '2026-05-05', ''),
(3, 1, '[1]'::jsonb, 'Дмитрий Савин', 'savin@og-center.ru', '+7 900 002-00-02', 'ДС', '[3]'::jsonb, TRUE, '2026-05-06', ''),
(4, 1, '[2]'::jsonb, 'Ольга Карпова', 'karpova@og-sever.ru', '+7 900 003-00-03', 'ОК', '[2]'::jsonb, TRUE, '2026-04-30', ''),
(5, 1, '[3]'::jsonb, 'Николай Рябов', 'ryabov@og-yug.ru', '+7 900 004-00-04', 'НР', '[3]'::jsonb, FALSE, '2026-04-15', '');

INSERT INTO locations (id, org_id, name, address, type, posts, contact, note, hourly_rate) VALUES
(1, 1, 'Объект А', 'ул. Ленина, 10, Москва', 'office', 3, '+7 900 100-00-01', 'Бизнес-центр класса А', 220),
(2, 1, 'Объект Б', 'ул. Промышленная, 5, Москва', 'warehouse', 3, '+7 900 100-00-02', 'Складской комплекс', 200),
(3, 1, 'Объект В', 'пр. Мира, 22, Москва', 'retail', 2, '+7 900 100-00-03', 'Торговый центр', 210),
(4, 2, 'Объект С-1', 'пр. Невский, 100, СПб', 'office', 2, '+7 900 200-00-01', 'Офис класса Б', 230),
(5, 2, 'Объект С-2', 'ул. Заводская, 3, СПб', 'industrial', 4, '+7 900 200-00-02', 'Завод', 240),
(6, 3, 'Объект Ю-1', 'ул. Красная, 55, Краснодар', 'retail', 2, '+7 900 300-00-01', 'ТРЦ', 195);

INSERT INTO employees (id, org_id, name, rank, status, location, shift, phone, hire_date, years_exp, seniority_bonus, note, extra_shift_rate, periodic_check_date, med_check_date) VALUES
(1, 1, 'Иванов Сергей А.', 'Ст. охранник', 'active', 'Объект А — Главный вход', '08:00 – 20:00', '+7 900 123-45-67', '2018-03-15', 8, 40, '', 1.5, '2025-05-10', '2025-04-20'),
(2, 1, 'Петров Андрей В.', 'Охранник', 'active', 'Объект А — Периметр', '08:00 – 20:00', '+7 900 234-56-78', '2021-07-01', 5, 25, '', 1.5, '2024-12-01', '2025-05-25'),
(3, 1, 'Смирнова Елена К.', 'Охранник', 'active', 'Объект Б — КПП', '20:00 – 08:00', '+7 900 345-67-89', '2022-01-10', 4, 20, '', 1.5, '2025-11-15', '2025-10-05'),
(4, 1, 'Козлов Дмитрий И.', 'Охранник', 'off', '—', 'Выходной', '+7 900 456-78-90', '2023-05-20', 3, 15, '', 1.5, '2025-06-01', '2024-11-30'),
(5, 1, 'Николаева Ирина Р.', 'Ст. охранник', 'active', 'Объект В — Парковка', '08:00 – 20:00', '+7 900 567-89-01', '2016-11-05', 10, 50, '', 2.0, '2025-02-28', '2025-08-10'),
(6, 1, 'Волков Павел С.', 'Охранник', 'sick', '—', 'Больничный', '+7 900 678-90-12', '2024-02-14', 2, 0, 'Больничный лист до 20.05', 1.5, '2025-05-20', '2025-05-01'),
(7, 1, 'Морозов Алексей Г.', 'Охранник', 'active', 'Объект Б — Склад', '08:00 – 20:00', '+7 900 789-01-23', '2020-09-01', 6, 30, '', 1.5, '2025-09-01', '2025-09-15'),
(8, 1, 'Фёдорова Наталья В.', 'Охранник', 'active', 'Объект В — Главный вход', '20:00 – 08:00', '+7 900 890-12-34', '2019-06-15', 7, 35, '', 1.5, '2025-07-20', '2025-03-10'),
(9, 2, 'Громов Илья К.', 'Ст. охранник', 'active', 'Объект С-1 — Вход', '08:00 – 20:00', '+7 900 111-00-01', '2017-04-10', 9, 45, '', 1.5, '2025-04-10', '2025-06-30'),
(10, 2, 'Зайцева Анна П.', 'Охранник', 'active', 'Объект С-2 — КПП', '08:00 – 20:00', '+7 900 111-00-02', '2022-08-22', 4, 20, '', 1.5, '2025-12-01', '2025-11-20'),
(11, 3, 'Тихонов Роман В.', 'Охранник', 'active', 'Объект Ю-1 — Вход', '08:00 – 20:00', '+7 900 222-00-01', '2021-03-01', 5, 25, '', 1.5, '2025-10-15', '2025-09-01');

INSERT INTO posts (id, org_id, name, location_id, officer_id, time, status, is_extra_shift, confirmed_at, confirmed_by, actual_start_time, actual_hours, closed_at, close_reason, close_note) VALUES
(1, 1, 'Главный вход', 1, 1, '08:00 – 20:00', 'covered', FALSE, '2026-05-13T08:05:00', 'Дмитрий Савин', '08:05', 12, '2026-05-13T20:00:00', 'auto', 'Закрыто автоматически по расписанию'),
(2, 1, 'Периметр (сев.)', 1, 2, '08:00 – 20:00', 'covered', FALSE, '2026-05-13T08:22:00', 'Дмитрий Савин', '08:22', NULL, NULL, NULL, NULL),
(3, 1, 'Периметр (юж.)', 1, NULL, '08:00 – 20:00', 'vacant', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 1, 'КПП', 2, 3, '20:00 – 08:00', 'covered', FALSE, '2026-05-12T20:03:00', 'Дмитрий Савин', '20:03', 12, '2026-05-13T08:00:00', 'auto', 'Закрыто автоматически по расписанию'),
(5, 1, 'Склад', 2, 7, '08:00 – 20:00', 'covered', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(6, 1, 'Ворота въезда', 2, NULL, '08:00 – 20:00', 'alert', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(7, 1, 'Парковка', 3, 5, '08:00 – 20:00', 'covered', FALSE, '2026-05-13T08:01:00', 'Дмитрий Савин', '08:01', NULL, NULL, NULL, NULL),
(8, 1, 'Главный вход', 3, 8, '20:00 – 08:00', 'covered', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(9, 2, 'Главный вход', 4, 9, '08:00 – 20:00', 'covered', FALSE, '2026-05-13T08:10:00', 'Ольга Карпова', '08:10', NULL, NULL, NULL, NULL),
(10, 2, 'КПП', 5, 10, '08:00 – 20:00', 'covered', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(11, 2, 'Периметр', 5, NULL, '20:00 – 08:00', 'vacant', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(12, 3, 'Главный вход', 6, 11, '08:00 – 20:00', 'covered', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(13, 3, 'Парковка', 6, NULL, '08:00 – 20:00', 'vacant', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO fine_reasons (id, org_id, label, amount, color) VALUES
(1, 1, 'Опоздание на смену', 500, 'text-amber-400 bg-amber-500/10 border-amber-500/20'),
(2, 1, 'Самовольное оставление поста', 2000, 'text-red-400 bg-red-500/10 border-red-500/20'),
(3, 1, 'Нарушение внешнего вида', 300, 'text-orange-400 bg-orange-500/10 border-orange-500/20'),
(4, 1, 'Нарушение регламента', 1000, 'text-rose-400 bg-rose-500/10 border-rose-500/20'),
(5, 1, 'Сон на посту', 3000, 'text-red-400 bg-red-500/10 border-red-500/20'),
(6, 1, 'Отказ от замены', 1500, 'text-orange-400 bg-orange-500/10 border-orange-500/20'),
(7, 2, 'Опоздание на смену', 500, 'text-amber-400 bg-amber-500/10 border-amber-500/20'),
(8, 2, 'Нарушение внешнего вида', 300, 'text-orange-400 bg-orange-500/10 border-orange-500/20'),
(9, 3, 'Опоздание на смену', 500, 'text-amber-400 bg-amber-500/10 border-amber-500/20');

INSERT INTO fines (id, org_id, date, employee_id, post_id, reason_id, note, amount) VALUES
(1, 1, '2026-04-25', 4, 3, 1, 'Опоздал на 40 минут', 500),
(2, 1, '2026-04-20', 6, 6, 2, 'Ушёл с поста без предупреждения', 2000),
(3, 1, '2026-04-18', 2, 2, 3, 'Без нагрудного знака', 300),
(4, 2, '2026-04-22', 9, 9, 7, 'Опоздание 20 мин', 500);

SELECT setval('holdings_id_seq', (SELECT MAX(id) FROM holdings));
SELECT setval('organizations_id_seq', (SELECT MAX(id) FROM organizations));
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));
SELECT setval('app_users_id_seq', (SELECT MAX(id) FROM app_users));
SELECT setval('locations_id_seq', (SELECT MAX(id) FROM locations));
SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees));
SELECT setval('posts_id_seq', (SELECT MAX(id) FROM posts));
SELECT setval('fine_reasons_id_seq', (SELECT MAX(id) FROM fine_reasons));
SELECT setval('fines_id_seq', (SELECT MAX(id) FROM fines));
