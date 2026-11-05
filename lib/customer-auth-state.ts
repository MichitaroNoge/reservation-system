export type CustomerAuthSnapshot<User> = {
  user: User | null;
  loading: boolean;
  error: string;
};

/** One live auth observation per browser document, shared across route mounts. */
export function createCustomerAuthState<User>(observe: (state: {
  setUser: (user: User | null) => void;
  setError: (error: string) => void;
}) => void) {
  const initial: CustomerAuthSnapshot<User> = { user: null, loading: true, error: "" };
  let snapshot = initial;
  let started = false;
  const listeners = new Set<() => void>();
  const publish = (next: CustomerAuthSnapshot<User>) => {
    snapshot = next;
    listeners.forEach(listener => listener());
  };
  const setUser = (user: User | null) => publish({ ...snapshot, user, loading: false });
  const setError = (error: string) => publish({ ...snapshot, error });

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    setUser,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!started) {
        started = true;
        // Keep observing with zero consumers so logout/account changes between routes
        // cannot leave a stale logged-in snapshot for the next screen.
        observe({ setUser, setError });
      }
      return () => { listeners.delete(listener); };
    },
  };
}
