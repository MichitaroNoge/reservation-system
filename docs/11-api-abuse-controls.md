# API abuse controls

All authenticated mutation APIs consume UID limits (30/minute, 200/hour) and IP limits (120/minute). Additional contact email registration also consumes 5/hour per UID and a 60-second UID cooldown. Every production email client consumes recipient limits (60-second cooldown, 10/hour, 30/day) including BCC, and a global 500/hour cap. Attempts consume quota even if delivery fails or a contact is deleted. Limits return 429 with Retry-After; storage failure returns 503 and denies execution.

For `DB_PROVIDER=drizzle`, counters are stored in PostgreSQL's `abuse_limit` table. Apply migration `0001_eager_jack_murdock.sql` before starting the application. All buckets use one transaction and sorted advisory locks, including concurrent requests across processes. A rejected bucket rolls back every bucket in that request. PostgreSQL mode does not require Firestore for rate limiting.

For the legacy Data Connect provider, provision Firestore in the Firebase Admin project. Give only the server service identity Firestore access; deny client access to `abuseLimits`. Enable TTL on its `expiresAt` field for cleanup (expiry correctness does not depend on TTL deletion). Both providers use hashed identifiers, durable counters and atomic transactions across all affected buckets. Never replace this storage with process-local counters. The limits, retry headers and fail-closed behavior are unchanged.

Configure `RATE_LIMIT_TRUSTED_IP_HEADER` only when the ingress overwrites it with a single validated client IP and direct origin access is blocked. Do not trust caller-supplied X-Forwarded-For. Without a trusted header all requests share the unknown-IP bucket, which is conservative but may limit unrelated users.

JSON readers cap actual streamed bytes at 64 KiB (413). Reservation menus and assignments cap at 50 entries (400); email recipients cap at 10.

Configure Cloud Logging log-based metrics for `email_send_attempt`, `email_send_success`, `email_send_failure`, and `abuse_limit_exceeded`. Create a Cloud Monitoring notification policy for `severity=WARNING` / `event=email_send_attempt` (400 attempts/hour), rate-limit rejections, storage unavailability, and delivery failures; route to the operations notification channel. Structured events omit addresses, UIDs and message content. Alert policies and channels must be configured in the deployment project; logs alone do not send notifications. Check the global 500/hour cap against expected scheduled batch volume before deployment.
