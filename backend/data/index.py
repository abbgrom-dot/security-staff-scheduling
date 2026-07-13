import json
import os
import hashlib
import binascii
import secrets
import psycopg2
import psycopg2.extras

PW_ITERATIONS = 100000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, PW_ITERATIONS)
    return f"pbkdf2_sha256${PW_ITERATIONS}${binascii.hexlify(salt).decode()}${binascii.hexlify(dk).decode()}"

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
    'Content-Type': 'application/json',
}

# ── Права, необходимые для каждой мутации (entity/action → permission) ────────
REQUIRED_PERM = {
    ('org', 'add'): 'holding:view',
    ('org', 'edit'): 'holding:view',
    ('org', 'delete'): 'holding:view',
    ('holding', 'edit'): 'holding:view',
    ('role', 'add'): 'roles:edit',
    ('role', 'edit'): 'roles:edit',
    ('role', 'delete'): 'roles:edit',
    ('user', 'add'): 'users:edit',
    ('user', 'edit'): 'users:edit',
    ('user', 'delete'): 'users:edit',
    ('location', 'add'): 'objects:edit',
    ('location', 'edit'): 'objects:edit',
    ('location', 'delete'): 'objects:edit',
    ('post', 'add'): 'objects:edit',
    ('post', 'edit'): 'objects:edit',
    ('post', 'delete'): 'objects:edit',
    ('post', 'assign'): 'placements:edit',
    ('post', 'confirm'): 'placements:edit',
    ('post', 'close'): 'placements:edit',
    ('employee', 'add'): 'employees:edit',
    ('employee', 'edit'): 'employees:edit',
    ('employee', 'setStatus'): 'employees:edit',
    ('employee', 'delete'): 'employees:edit',
    ('fineReasons', 'replace'): 'fines:edit',
    ('fine', 'add'): 'fines:edit',
}


def get_user_permissions(cur, user_id):
    '''Собирает множество прав пользователя из его ролей (данные из БД, не с фронта).'''
    cur.execute("SELECT role_ids, is_active FROM app_users WHERE id=%s", (user_id,))
    row = cur.fetchone()
    if not row or not row['is_active']:
        return set(), False
    role_ids = row['role_ids'] or []
    if not role_ids:
        return set(), True
    cur.execute("SELECT permissions FROM roles WHERE id = ANY(%s)", (list(role_ids),))
    perms = set()
    for r in cur.fetchall():
        for p in (r['permissions'] or []):
            perms.add(p)
    return perms, True


def check_permission(cur, user_id, entity, action):
    '''Возвращает (ok, error). Проверяет право на сервере перед мутацией.'''
    required = REQUIRED_PERM.get((entity, action))
    if required is None:
        return True, None  # неизвестная пара обрабатывается ниже как обычно
    if user_id is None:
        return False, 'Не авторизован'
    perms, active = get_user_permissions(cur, user_id)
    if not active:
        return False, 'Учётная запись заблокирована'
    if required not in perms:
        return False, 'Недостаточно прав'
    return True, None


def _role_ids_with_perm(cur, perm):
    cur.execute("SELECT id FROM roles WHERE permissions @> %s::jsonb", (json.dumps([perm]),))
    return [r['id'] for r in cur.fetchall()]


def _active_super_admins(cur):
    '''ID активных пользователей с правом holding:view (суперадмины).'''
    sa_role_ids = set(_role_ids_with_perm(cur, 'holding:view'))
    if not sa_role_ids:
        return []
    # role_ids хранится как JSONB (список id) — фильтруем на стороне Python.
    cur.execute("SELECT id, role_ids FROM app_users WHERE is_active = TRUE")
    result = []
    for r in cur.fetchall():
        if set(r['role_ids'] or []) & sa_role_ids:
            result.append(r['id'])
    return result


def guard_super_admin(cur, entity, action, d, user_id):
    '''Не даёт удалить/деактивировать последнего суперадмина и заблокировать себя.'''
    if entity != 'user':
        return None
    target_id = d.get('id')
    if target_id is None:
        return None

    supers = set(_active_super_admins(cur))

    if action == 'delete':
        if user_id is not None and target_id == user_id:
            return 'Нельзя удалить собственную учётную запись'
        if target_id in supers and len(supers) <= 1:
            return 'Нельзя удалить последнего суперадминистратора'

    if action == 'edit':
        # Блокировка (is_active=false) или снятие админ-роли с последнего суперадмина
        sa_role_ids = set(_role_ids_with_perm(cur, 'holding:view'))
        new_is_active = d.get('isActive', True)
        removes_admin = 'roleIds' in d and not (set(d.get('roleIds') or []) & sa_role_ids)
        if target_id in supers and len(supers) <= 1 and (new_is_active is False or removes_admin):
            return 'Нельзя лишить прав последнего суперадминистратора'
        if user_id is not None and target_id == user_id and new_is_active is False:
            return 'Нельзя заблокировать собственную учётную запись'

    return None


def resp(status, body):
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(body, default=str)}


# ── Row mappers (snake_case → camelCase) ──────────────────────────────────────
def map_org(r):
    return {'id': r['id'], 'holdingId': r['holding_id'], 'name': r['name'], 'shortName': r['short_name'],
            'inn': r['inn'], 'address': r['address'], 'phone': r['phone'], 'license': r['license'], 'color': r['color']}


def map_role(r):
    return {'id': r['id'], 'orgId': r['org_id'], 'name': r['name'], 'description': r['description'],
            'permissions': r['permissions'], 'isSystem': r['is_system']}


def map_user(r):
    return {'id': r['id'], 'holdingId': r['holding_id'], 'orgIds': r['org_ids'], 'name': r['name'],
            'email': r['email'], 'phone': r['phone'], 'avatarInitials': r['avatar_initials'],
            'roleIds': r['role_ids'], 'isActive': r['is_active'], 'lastLogin': r['last_login']}


def map_location(r):
    return {'id': r['id'], 'orgId': r['org_id'], 'name': r['name'], 'address': r['address'], 'type': r['type'],
            'posts': r['posts'], 'contact': r['contact'], 'note': r['note'], 'hourlyRate': r['hourly_rate']}


def map_employee(r):
    return {'id': r['id'], 'orgId': r['org_id'], 'name': r['name'], 'rank': r['rank'], 'status': r['status'],
            'location': r['location'], 'shift': r['shift'], 'phone': r['phone'], 'hireDate': r['hire_date'],
            'yearsExp': r['years_exp'], 'seniorityBonus': r['seniority_bonus'], 'note': r['note'],
            'extraShiftRate': float(r['extra_shift_rate']), 'periodicCheckDate': r['periodic_check_date'],
            'medCheckDate': r['med_check_date']}


def map_post(r):
    return {'id': r['id'], 'orgId': r['org_id'], 'name': r['name'], 'locationId': r['location_id'],
            'officerId': r['officer_id'], 'time': r['time'], 'status': r['status'],
            'isExtraShift': r['is_extra_shift'], 'confirmedAt': r['confirmed_at'], 'confirmedBy': r['confirmed_by'],
            'actualStartTime': r['actual_start_time'],
            'actualHours': float(r['actual_hours']) if r['actual_hours'] is not None else None,
            'closedAt': r['closed_at'], 'closeReason': r['close_reason'], 'closeNote': r['close_note']}


def map_fine_reason(r):
    return {'id': r['id'], 'orgId': r['org_id'], 'label': r['label'], 'amount': r['amount'], 'color': r['color']}


def map_fine(r):
    return {'id': r['id'], 'orgId': r['org_id'], 'date': r['date'], 'employeeId': r['employee_id'],
            'postId': r['post_id'], 'reasonId': r['reason_id'], 'note': r['note'], 'amount': r['amount']}


def load_all(cur):
    cur.execute("SELECT * FROM holdings ORDER BY id LIMIT 1")
    h = cur.fetchone()
    holding = {'id': h['id'], 'name': h['name'], 'inn': h['inn'], 'logo': h.get('logo')} if h else None

    cur.execute("SELECT * FROM organizations ORDER BY id")
    orgs = [map_org(r) for r in cur.fetchall()]
    cur.execute("SELECT * FROM roles ORDER BY id")
    roles = [map_role(r) for r in cur.fetchall()]
    cur.execute("SELECT * FROM app_users ORDER BY id")
    users = [map_user(r) for r in cur.fetchall()]
    cur.execute("SELECT * FROM locations ORDER BY id")
    locations = [map_location(r) for r in cur.fetchall()]
    cur.execute("SELECT * FROM employees ORDER BY id")
    employees = [map_employee(r) for r in cur.fetchall()]
    cur.execute("SELECT * FROM posts ORDER BY id")
    posts = [map_post(r) for r in cur.fetchall()]
    cur.execute("SELECT * FROM fine_reasons ORDER BY id")
    fine_reasons = [map_fine_reason(r) for r in cur.fetchall()]
    cur.execute("SELECT * FROM fines ORDER BY id")
    fines = [map_fine(r) for r in cur.fetchall()]

    return {'holding': holding, 'orgs': orgs, 'roles': roles, 'users': users, 'locations': locations,
            'employees': employees, 'posts': posts, 'fineReasons': fine_reasons, 'fines': fines}


def handler(event: dict, context) -> dict:
    '''
    Основной API данных SecureOps. GET — загрузка всех данных. POST/PUT/DELETE — CRUD по сущностям.
    Сущность и действие задаются в query-параметре entity и в теле запроса (action, data).
    '''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = False
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        if method == 'GET':
            data = load_all(cur)
            return resp(200, data)

        body = json.loads(event.get('body') or '{}')
        entity = body.get('entity')
        action = body.get('action')
        d = body.get('data') or {}

        # ── Проверка прав на сервере ──────────────────────────────────────────
        headers = event.get('headers') or {}
        raw_uid = headers.get('X-User-Id') or headers.get('x-user-id')
        user_id = int(raw_uid) if raw_uid not in (None, '') else None

        ok, err = check_permission(cur, user_id, entity, action)
        if not ok:
            return resp(403, {'error': err})

        # ── Защита от самоблокировки / потери последнего суперадмина ──────────
        guard_err = guard_super_admin(cur, entity, action, d, user_id)
        if guard_err:
            return resp(403, {'error': guard_err})

        result = handle_mutation(cur, entity, action, d)
        conn.commit()
        return resp(200, result)
    except Exception as e:
        conn.rollback()
        return resp(400, {'error': str(e)})
    finally:
        conn.close()


def _perms_json(v):
    return json.dumps(v)


def handle_mutation(cur, entity, action, d):
    # ── Organizations ─────────────────────────────────────────────────────────
    if entity == 'org':
        if action == 'add':
            cur.execute(
                "INSERT INTO organizations (holding_id, name, short_name, inn, address, phone, license, color) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
                (d['holdingId'], d['name'], d['shortName'], d['inn'], d.get('address', ''), d.get('phone', ''),
                 d.get('license', ''), d.get('color', '#6366f1')))
            return {'item': map_org(cur.fetchone())}
        if action == 'edit':
            cur.execute(
                "UPDATE organizations SET name=%s, short_name=%s, inn=%s, address=%s, phone=%s, license=%s, color=%s "
                "WHERE id=%s RETURNING *",
                (d['name'], d['shortName'], d['inn'], d.get('address', ''), d.get('phone', ''),
                 d.get('license', ''), d.get('color', '#6366f1'), d['id']))
            return {'item': map_org(cur.fetchone())}
        if action == 'delete':
            cur.execute("DELETE FROM organizations WHERE id=%s", (d['id'],))
            return {'ok': True}

    # ── Roles ─────────────────────────────────────────────────────────────────
    if entity == 'role':
        if action == 'add':
            cur.execute(
                "INSERT INTO roles (org_id, name, description, permissions, is_system) VALUES (%s,%s,%s,%s,%s) RETURNING *",
                (d.get('orgId'), d['name'], d.get('description', ''), _perms_json(d.get('permissions', [])),
                 d.get('isSystem', False)))
            return {'item': map_role(cur.fetchone())}
        if action == 'edit':
            cur.execute(
                "UPDATE roles SET org_id=%s, name=%s, description=%s, permissions=%s, is_system=%s WHERE id=%s RETURNING *",
                (d.get('orgId'), d['name'], d.get('description', ''), _perms_json(d.get('permissions', [])),
                 d.get('isSystem', False), d['id']))
            return {'item': map_role(cur.fetchone())}
        if action == 'delete':
            cur.execute("DELETE FROM roles WHERE id=%s", (d['id'],))
            return {'ok': True}

    # ── Users ─────────────────────────────────────────────────────────────────
    if entity == 'user':
        if action == 'add':
            pw = d.get('password') or 'demo1234'
            cur.execute(
                "INSERT INTO app_users (holding_id, org_ids, name, email, phone, avatar_initials, role_ids, is_active, last_login, password_hash) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
                (d['holdingId'], json.dumps(d.get('orgIds', [])), d['name'], d['email'], d.get('phone', ''),
                 d.get('avatarInitials', ''), json.dumps(d.get('roleIds', [])), d.get('isActive', True),
                 d.get('lastLogin', ''), hash_password(pw)))
            return {'item': map_user(cur.fetchone())}
        if action == 'edit':
            cur.execute("SELECT * FROM app_users WHERE id=%s", (d['id'],))
            cur_row = cur.fetchone()
            merged = {
                'org_ids': json.dumps(d['orgIds']) if 'orgIds' in d else json.dumps(cur_row['org_ids']),
                'name': d.get('name', cur_row['name']),
                'email': d.get('email', cur_row['email']),
                'phone': d.get('phone', cur_row['phone']),
                'avatar_initials': d.get('avatarInitials', cur_row['avatar_initials']),
                'role_ids': json.dumps(d['roleIds']) if 'roleIds' in d else json.dumps(cur_row['role_ids']),
                'is_active': d.get('isActive', cur_row['is_active']),
            }
            cur.execute(
                "UPDATE app_users SET org_ids=%s, name=%s, email=%s, phone=%s, avatar_initials=%s, role_ids=%s, is_active=%s "
                "WHERE id=%s RETURNING *",
                (merged['org_ids'], merged['name'], merged['email'], merged['phone'], merged['avatar_initials'],
                 merged['role_ids'], merged['is_active'], d['id']))
            return {'item': map_user(cur.fetchone())}
        if action == 'delete':
            cur.execute("DELETE FROM app_users WHERE id=%s", (d['id'],))
            return {'ok': True}

    # ── Locations ─────────────────────────────────────────────────────────────
    if entity == 'location':
        if action == 'add':
            cur.execute(
                "INSERT INTO locations (org_id, name, address, type, posts, contact, note, hourly_rate) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
                (d['orgId'], d['name'], d.get('address', ''), d.get('type', 'office'), d.get('posts', 0),
                 d.get('contact', ''), d.get('note', ''), d.get('hourlyRate', 0)))
            return {'item': map_location(cur.fetchone())}
        if action == 'edit':
            cur.execute(
                "UPDATE locations SET name=%s, address=%s, type=%s, posts=%s, contact=%s, note=%s, hourly_rate=%s "
                "WHERE id=%s RETURNING *",
                (d['name'], d.get('address', ''), d.get('type', 'office'), d.get('posts', 0),
                 d.get('contact', ''), d.get('note', ''), d.get('hourlyRate', 0), d['id']))
            return {'item': map_location(cur.fetchone())}
        if action == 'delete':
            cur.execute("DELETE FROM locations WHERE id=%s", (d['id'],))
            return {'ok': True}

    # ── Employees ─────────────────────────────────────────────────────────────
    if entity == 'employee':
        if action == 'add':
            cur.execute(
                "INSERT INTO employees (org_id, name, rank, status, location, shift, phone, hire_date, years_exp, "
                "seniority_bonus, note, extra_shift_rate, periodic_check_date, med_check_date) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
                (d['orgId'], d['name'], d.get('rank', 'Охранник'), d.get('status', 'active'), d.get('location', '—'),
                 d.get('shift', ''), d.get('phone', ''), d.get('hireDate', ''), d.get('yearsExp', 0),
                 d.get('seniorityBonus', 0), d.get('note', ''), d.get('extraShiftRate', 1.5),
                 d.get('periodicCheckDate', ''), d.get('medCheckDate', '')))
            return {'item': map_employee(cur.fetchone())}
        if action == 'edit':
            cur.execute(
                "UPDATE employees SET name=%s, rank=%s, status=%s, location=%s, shift=%s, phone=%s, hire_date=%s, "
                "years_exp=%s, seniority_bonus=%s, note=%s, extra_shift_rate=%s, periodic_check_date=%s, med_check_date=%s "
                "WHERE id=%s RETURNING *",
                (d['name'], d.get('rank', 'Охранник'), d.get('status', 'active'), d.get('location', '—'),
                 d.get('shift', ''), d.get('phone', ''), d.get('hireDate', ''), d.get('yearsExp', 0),
                 d.get('seniorityBonus', 0), d.get('note', ''), d.get('extraShiftRate', 1.5),
                 d.get('periodicCheckDate', ''), d.get('medCheckDate', ''), d['id']))
            return {'item': map_employee(cur.fetchone())}
        if action == 'setStatus':
            cur.execute("UPDATE employees SET status=%s WHERE id=%s RETURNING *", (d['status'], d['id']))
            return {'item': map_employee(cur.fetchone())}
        if action == 'delete':
            cur.execute("DELETE FROM employees WHERE id=%s", (d['id'],))
            return {'ok': True}

    # ── Posts ─────────────────────────────────────────────────────────────────
    if entity == 'post':
        if action == 'assign':
            cur.execute(
                "UPDATE posts SET officer_id=%s, status=%s, is_extra_shift=%s, confirmed_at=NULL, confirmed_by=NULL, "
                "actual_start_time=NULL, actual_hours=NULL, closed_at=NULL, close_reason=NULL, close_note=NULL "
                "WHERE id=%s RETURNING *",
                (d.get('officerId'), d.get('status', 'vacant'), d.get('isExtraShift', False), d['id']))
            return {'item': map_post(cur.fetchone())}
        if action == 'confirm':
            cur.execute(
                "UPDATE posts SET confirmed_at=%s, confirmed_by=%s, actual_start_time=%s, actual_hours=NULL "
                "WHERE id=%s RETURNING *",
                (d['confirmedAt'], d['confirmedBy'], d['actualStartTime'], d['id']))
            return {'item': map_post(cur.fetchone())}
        if action == 'close':
            cur.execute(
                "UPDATE posts SET actual_hours=%s, closed_at=%s, close_reason=%s, close_note=%s WHERE id=%s RETURNING *",
                (d['actualHours'], d['closedAt'], d['closeReason'], d.get('closeNote'), d['id']))
            return {'item': map_post(cur.fetchone())}
        if action == 'add':
            cur.execute(
                "INSERT INTO posts (org_id, name, location_id, officer_id, time, status, is_extra_shift) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *",
                (d['orgId'], d['name'], d['locationId'], d.get('officerId'), d.get('time', ''),
                 d.get('status', 'vacant'), d.get('isExtraShift', False)))
            return {'item': map_post(cur.fetchone())}
        if action == 'edit':
            cur.execute(
                "UPDATE posts SET name=%s, location_id=%s, time=%s WHERE id=%s RETURNING *",
                (d['name'], d['locationId'], d.get('time', ''), d['id']))
            return {'item': map_post(cur.fetchone())}
        if action == 'delete':
            cur.execute("DELETE FROM fines WHERE post_id=%s", (d['id'],))
            cur.execute("DELETE FROM posts WHERE id=%s", (d['id'],))
            return {'ok': True}

    # ── Holding ───────────────────────────────────────────────────────────────
    if entity == 'holding' and action == 'edit':
        cur.execute(
            "UPDATE holdings SET name=%s, inn=%s, logo=%s WHERE id=%s RETURNING *",
            (d['name'], d.get('inn', ''), d.get('logo'), d['id']))
        h = cur.fetchone()
        return {'item': {'id': h['id'], 'name': h['name'], 'inn': h['inn'], 'logo': h['logo']}}

    # ── Fine Reasons (replace all for org) ────────────────────────────────────
    if entity == 'fineReasons' and action == 'replace':
        org_id = d['orgId']
        reasons = d['reasons']
        cur.execute("DELETE FROM fine_reasons WHERE org_id=%s", (org_id,))
        out = []
        for r in reasons:
            cur.execute(
                "INSERT INTO fine_reasons (org_id, label, amount, color) VALUES (%s,%s,%s,%s) RETURNING *",
                (org_id, r['label'], r['amount'], r.get('color', '')))
            out.append(map_fine_reason(cur.fetchone()))
        return {'items': out}

    # ── Fines ─────────────────────────────────────────────────────────────────
    if entity == 'fine' and action == 'add':
        cur.execute(
            "INSERT INTO fines (org_id, date, employee_id, post_id, reason_id, note, amount) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *",
            (d['orgId'], d['date'], d.get('employeeId'), d.get('postId'), d.get('reasonId'),
             d.get('note', ''), d.get('amount', 0)))
        return {'item': map_fine(cur.fetchone())}

    raise ValueError(f'Unknown entity/action: {entity}/{action}')