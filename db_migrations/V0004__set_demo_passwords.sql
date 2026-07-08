UPDATE app_users
SET password_hash = 'pbkdf2_sha256$100000$17340e443a9814156121304b4415ba02$e6606d53ce3303d075095cffa760a909022aef2fbf1b2b33e11b7345e5537cce'
WHERE password_hash = '' OR password_hash IS NULL;
