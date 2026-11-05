import assert from "node:assert/strict";
import { test } from "node:test";
import { createCustomerAuthState } from "../lib/customer-auth-state";

test("customer auth survives screen unmounts with one observer and receives logout between screens", () => {
  let observations = 0;
  let observer!: { setUser: (user: { uid: string } | null) => void; setError: (error: string) => void };
  const store = createCustomerAuthState<{ uid: string }>(state => { observations++; observer = state; });
  const server = store.getServerSnapshot();
  assert.deepEqual(server, { user: null, loading: true, error: "" });
  const unsubscribe = store.subscribe(() => {});
  assert.equal(store.getSnapshot().loading, true);
  observer.setUser({ uid: "customer-a" });
  const authenticated = store.getSnapshot();
  unsubscribe();
  const unsubscribeNext = store.subscribe(() => {});
  assert.equal(store.getSnapshot(), authenticated, "navigation must not reset confirmed auth");
  assert.equal(observations, 1);
  unsubscribeNext();
  observer.setUser(null);
  const unsubscribeThird = store.subscribe(() => {});
  assert.deepEqual(store.getSnapshot(), { user: null, loading: false, error: "" });
  assert.equal(observations, 1, "Strict Mode/remounts must not duplicate Firebase observers");
  observer.setUser({ uid: "customer-b" });
  assert.equal(store.getSnapshot().user?.uid, "customer-b");
  assert.equal(store.getServerSnapshot(), server, "SSR must never expose a previous client's auth");
  unsubscribeThird();
});

test("customer auth publishes verification changes on the same user object and preserves persistence errors", () => {
  const store = createCustomerAuthState<{ verified: boolean }>(() => {});
  let changes = 0;
  const unsubscribe = store.subscribe(() => { changes++; });
  const user = { verified: false };
  store.setUser(user);
  const before = store.getSnapshot();
  user.verified = true;
  store.setUser(user);
  assert.notEqual(store.getSnapshot(), before, "React must observe in-place Firebase user updates");
  assert.equal(store.getSnapshot().user?.verified, true);
  assert.equal(changes, 2);
  unsubscribe();
  store.setUser(null);
  assert.equal(changes, 2, "unmounted screens must not receive notifications");

  const failed = createCustomerAuthState<{ uid: string }>(state => {
    state.setError("保存設定を確認してください。");
    state.setUser({ uid: "customer-a" });
  });
  const cleanup = failed.subscribe(() => {});
  assert.equal(failed.getSnapshot().loading, false);
  assert.equal(failed.getSnapshot().error, "保存設定を確認してください。");
  cleanup();
});
