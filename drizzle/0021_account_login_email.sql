CREATE FUNCTION normalize_login_email(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$ SELECT lower(btrim(value, U&'\0009\000a\000b\000c\000d\0020\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff')) $$;
--> statement-breakpoint
-- Hold the lock through the duplicate check and index creation to close the migration race.
LOCK TABLE account IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM account WHERE active GROUP BY normalize_login_email(email) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Active login email duplicates exist. Run scripts/sql/check-login-email-duplicates.sql and review the accounts before retrying.';
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX account_active_login_email_unique ON account (normalize_login_email(email)) WHERE active = true;
