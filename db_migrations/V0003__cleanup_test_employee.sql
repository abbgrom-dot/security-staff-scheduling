UPDATE employees
SET name = 'Соколов Максим Д.',
    rank = 'Охранник',
    status = 'off',
    location = '—',
    shift = 'Выходной',
    phone = '+7 900 901-23-45',
    hire_date = '2023-09-10',
    years_exp = 3,
    seniority_bonus = 15,
    note = '',
    extra_shift_rate = 1.5,
    periodic_check_date = '2025-08-01',
    med_check_date = '2025-07-15'
WHERE id = 12 AND name = 'Тест Тестов';
