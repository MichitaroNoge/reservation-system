-- Read-only: run before the migration; never automatically merge/delete/disable accounts.
WITH identities AS (
  SELECT id, firebase_uid, email, active, lower(btrim(email, U&'\0009\000a\000b\000c\000d\0020\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff')) AS login_email
  FROM account
)
SELECT login_email, jsonb_agg(jsonb_build_object('id', id, 'firebaseUid', firebase_uid, 'email', email) ORDER BY id) AS accounts
FROM identities WHERE active GROUP BY login_email HAVING count(*) > 1;
