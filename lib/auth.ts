import { limitAuthenticatedMutation } from "./abuse-limits";
import { cert, getApps, initializeApp, type AppOptions } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { isGoogleCustomerSessionCurrent } from "./google-auth";

export class ApiAuthError extends Error {
  constructor(message: string, public readonly statusCode: 401 | 403) {
    super(message);
    this.name = "ApiAuthError";
  }
}

export async function requireAdmin(request: Request) {
  const token = bearerToken(request);
  if (!token) throw new ApiAuthError("Authentication required.", 401);

  const auth = getAuth(getFirebaseAdminApp());
  let decoded: DecodedIdToken;
  try { decoded = await auth.verifyIdToken(token, true); }
  catch { throw new ApiAuthError("Invalid authentication token.", 401); }
  if (!isAdminToken(decoded)) throw new ApiAuthError("Admin permission required.", 403);
  await limitAuthenticatedMutation(request, decoded.uid);
  return decoded;
}

export async function verifyOptionalFirebaseUser(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  try {
    const auth = getAuth(getFirebaseAdminApp());
    const decoded = await auth.verifyIdToken(token, true);
    if (decoded.firebase?.sign_in_provider === "custom" || typeof decoded.customerGoogleSub === "string") {
      const current = await auth.getUser(decoded.uid);
      if (!isGoogleCustomerSessionCurrent(decoded, current)) throw new Error("Google session no longer linked");
    }
    return decoded;
  } catch {
    throw new ApiAuthError("Invalid authentication token.", 401);
  }
}

export async function requireVerifiedFirebaseUser(request: Request) {
  const user = await requireFirebaseUser(request);
  if (user.email_verified !== true) throw new ApiAuthError("Email verification required.", 403);
  return user;
}

export const recentAuthenticationMaxAgeSeconds = 5 * 60;

/** Token refresh changes iat, not auth_time. Sensitive operations require an actual sign-in/reauthentication. */
export function assertRecentAuthentication(user: DecodedIdToken, nowSeconds = Math.floor(Date.now() / 1000)) {
  // Replaying a custom token must not turn an old Google proof into a fresh reauthentication.
  const authenticatedAt = typeof user.customerGoogleSub === "string" ? user.customerGoogleAuthenticatedAt : user.auth_time;
  if (typeof authenticatedAt !== "number" || !Number.isSafeInteger(authenticatedAt) || authenticatedAt <= 0 || authenticatedAt > nowSeconds + 30 || nowSeconds - authenticatedAt > recentAuthenticationMaxAgeSeconds) {
    throw new ApiAuthError("安全のため、本人確認を行ってから、もう一度お試しください。", 403);
  }
}

export async function requireRecentlyAuthenticatedFirebaseUser(request: Request) {
  const user = await requireVerifiedFirebaseUser(request);
  assertRecentAuthentication(user);
  return user;
}

export async function requireFirebaseUser(request: Request) {
  const user = await verifyOptionalFirebaseUser(request);
  if (!user) throw new ApiAuthError("Customer authentication required.", 401);
  await limitAuthenticatedMutation(request, user.uid);
  return user;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

export function isAdminToken(decoded: DecodedIdToken) {
  if (decoded.firebase?.sign_in_provider === "custom" || typeof decoded.customerGoogleSub === "string") return false;
  if (decoded.admin === true || decoded.role === "admin") return true;
  const adminEmails = (process.env.FIREBASE_AUTH_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  // An email claim alone does not prove ownership until Firebase has verified it.
  return Boolean(decoded.email_verified === true && decoded.email && adminEmails.includes(decoded.email.toLowerCase()));
}

export function getFirebaseAdminApp() {
  const app = getApps()[0];
  if (app) return app;

  const options: AppOptions = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT,
  };
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) options.credential = cert(JSON.parse(serviceAccount));
  return initializeApp(options);
}
