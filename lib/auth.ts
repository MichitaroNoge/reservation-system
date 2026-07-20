import { cert, getApps, initializeApp, type AppOptions } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

export class ApiAuthError extends Error {
  constructor(message: string, public readonly statusCode: 401 | 403) {
    super(message);
    this.name = "ApiAuthError";
  }
}

export async function requireAdmin(request: Request) {
  const token = bearerToken(request);
  if (!token) throw new ApiAuthError("Authentication required.", 401);

  const decoded = await getAuth(adminApp()).verifyIdToken(token);
  if (!isAdminToken(decoded)) throw new ApiAuthError("Admin permission required.", 403);
  return decoded;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

function isAdminToken(decoded: DecodedIdToken) {
  if (decoded.admin === true || decoded.role === "admin") return true;
  const adminEmails = (process.env.FIREBASE_AUTH_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(decoded.email && adminEmails.includes(decoded.email.toLowerCase()));
}

function adminApp() {
  const app = getApps()[0];
  if (app) return app;

  const options: AppOptions = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT,
  };
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) options.credential = cert(JSON.parse(serviceAccount));
  return initializeApp(options);
}
