import json
import os
import datetime
import psycopg2
import psycopg2.extras


def handler(event: dict, context) -> dict:
    '''
    Авторизация пользователя по email. Возвращает данные пользователя, роли и организации.
    Пароль в демо-режиме принимается любой (проверяется только существование и активность пользователя).
    '''
    method = event.get('httpMethod', 'GET')

    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
        'Content-Type': 'application/json',
    }

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    if method != 'POST':
        return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    email = (body.get('email') or '').strip().lower()

    if not email:
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Email обязателен'})}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT id, holding_id, org_ids, name, email, phone, avatar_initials, role_ids, is_active, last_login "
            "FROM app_users WHERE lower(email) = %s",
            (email,),
        )
        row = cur.fetchone()

        if not row:
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Неверный email или пользователь не найден'})}
        if not row['is_active']:
            return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Пользователь неактивен'})}

        user = {
            'id': row['id'],
            'holdingId': row['holding_id'],
            'orgIds': row['org_ids'],
            'name': row['name'],
            'email': row['email'],
            'phone': row['phone'],
            'avatarInitials': row['avatar_initials'],
            'roleIds': row['role_ids'],
            'isActive': row['is_active'],
            'lastLogin': row['last_login'],
        }

        cur.execute("UPDATE app_users SET last_login = %s WHERE id = %s",
                    (datetime.date.today().isoformat(), row['id']))
        conn.commit()

        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'user': user})}
    finally:
        conn.close()