import json
import os
import datetime
import hashlib
import hmac
import binascii
import secrets
import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
    'Content-Type': 'application/json',
}

ITERATIONS = 100000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, ITERATIONS)
    return f"pbkdf2_sha256${ITERATIONS}${binascii.hexlify(salt).decode()}${binascii.hexlify(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt_hex, hash_hex = stored.split('$')
        if algo != 'pbkdf2_sha256':
            return False
        salt = binascii.unhexlify(salt_hex)
        dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, int(iters))
        return hmac.compare_digest(binascii.hexlify(dk).decode(), hash_hex)
    except Exception:
        return False


def resp(status, body):
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(body)}


def handler(event: dict, context) -> dict:
    '''
    Авторизация и управление паролями SecureOps.
    action=login — вход по email и паролю (проверка pbkdf2-хеша).
    action=changePassword — смена пароля пользователя (нужен текущий пароль).
    '''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    if method != 'POST':
        return resp(405, {'error': 'Method not allowed'})

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', 'login')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        if action == 'changePassword':
            return change_password(conn, cur, body)

        return login(conn, cur, body)
    finally:
        conn.close()


def login(conn, cur, body):
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''

    if not email:
        return resp(400, {'error': 'Email обязателен'})
    if not password:
        return resp(400, {'error': 'Введите пароль'})

    cur.execute(
        "SELECT id, holding_id, org_ids, name, email, phone, avatar_initials, role_ids, is_active, last_login, password_hash "
        "FROM app_users WHERE lower(email) = %s",
        (email,),
    )
    row = cur.fetchone()

    if not row:
        return resp(401, {'error': 'Неверный email или пароль'})
    if not row['is_active']:
        return resp(403, {'error': 'Пользователь неактивен'})
    if not row['password_hash'] or not verify_password(password, row['password_hash']):
        return resp(401, {'error': 'Неверный email или пароль'})

    user = {
        'id': row['id'], 'holdingId': row['holding_id'], 'orgIds': row['org_ids'],
        'name': row['name'], 'email': row['email'], 'phone': row['phone'],
        'avatarInitials': row['avatar_initials'], 'roleIds': row['role_ids'],
        'isActive': row['is_active'], 'lastLogin': row['last_login'],
    }

    cur.execute("UPDATE app_users SET last_login = %s WHERE id = %s",
                (datetime.date.today().isoformat(), row['id']))
    conn.commit()

    return resp(200, {'user': user})


def change_password(conn, cur, body):
    user_id = body.get('userId')
    current = body.get('currentPassword') or ''
    new_password = body.get('newPassword') or ''

    if not user_id:
        return resp(400, {'error': 'Не указан пользователь'})
    if len(new_password) < 6:
        return resp(400, {'error': 'Новый пароль должен быть не короче 6 символов'})

    cur.execute("SELECT password_hash FROM app_users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    if not row:
        return resp(404, {'error': 'Пользователь не найден'})
    if not row['password_hash'] or not verify_password(current, row['password_hash']):
        return resp(401, {'error': 'Текущий пароль неверный'})

    new_hash = hash_password(new_password)
    cur.execute("UPDATE app_users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
    conn.commit()

    return resp(200, {'ok': True})
