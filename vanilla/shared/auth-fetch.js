export async function getIdToken(auth, forceRefresh = false) {
  const user = auth && auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

export function createAuthFetch(auth) {
  return async function authFetch(path, init = {}) {
    const token = await getIdToken(auth);
    const headers = new Headers(init.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(path, { ...init, headers, credentials: "same-origin" });
  };
}
