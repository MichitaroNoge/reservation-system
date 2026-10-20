import { loadEnvConfig } from "@next/env";
import { revokeUserSessions, removeAdminAccessAndRevokeSessions } from "../lib/auth-session-management";

async function main() {
  const action = process.argv[2];
  const uidIndex = process.argv.indexOf("--uid");
  const confirmIndex = process.argv.indexOf("--confirm");
  const uid = uidIndex >= 0 ? process.argv[uidIndex + 1] : undefined;
  if (!["revoke", "remove-admin"].includes(action) || !uid || !/^[^\s]{1,128}$/.test(uid) || uid.startsWith("--") || confirmIndex < 0 || process.argv[confirmIndex + 1] !== uid) {
    throw new Error("対象UIDを確認してください: npm.cmd run auth:revoke -- --uid <UID> --confirm <UID> または auth:remove-admin");
  }
  loadEnvConfig(process.cwd(), true);
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
  const projectIndex = process.argv.indexOf("--project");
  if (!projectId || projectIndex < 0 || process.argv[projectIndex + 1] !== projectId) throw new Error("実行先FirebaseプロジェクトIDを --project <PROJECT_ID> で明示してください。");
  if (action === "revoke") await revokeUserSessions(uid);
  else await removeAdminAccessAndRevokeSessions(uid);
  console.log(`Firebase project ${projectId}: ${action} completed for the explicitly selected UID.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Session management failed."); process.exitCode = 1; });
