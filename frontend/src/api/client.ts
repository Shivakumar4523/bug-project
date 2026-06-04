const API_URL = import.meta.env.VITE_API_URL ?? "/api";
const sessionKeys = ["accessToken", "refreshToken", "user"] as const;
export const AUTH_EXPIRED_EVENT = "pirnav:auth-expired";

type RefreshResponse = {
  accessToken: string;
};

let refreshRequest: Promise<string | null> | null = null;

export function getToken() {
  return sessionStorage.getItem("accessToken") ?? localStorage.getItem("accessToken");
}

export function getRefreshToken() {
  return sessionStorage.getItem("refreshToken") ?? localStorage.getItem("refreshToken");
}

export function setSession(accessToken: string, refreshToken: string, user: unknown, remember = true) {
  clearSession();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem("accessToken", accessToken);
  storage.setItem("refreshToken", refreshToken);
  storage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  for (const key of sessionKeys) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

export function currentUser<T>() {
  const raw = sessionStorage.getItem("user") ?? localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as T) : null;
}

export function setCurrentUser(user: unknown) {
  const raw = JSON.stringify(user);
  if (sessionStorage.getItem("accessToken")) sessionStorage.setItem("user", raw);
  if (localStorage.getItem("accessToken")) localStorage.setItem("user", raw);
}

function getSessionStorage() {
  if (sessionStorage.getItem("refreshToken") || sessionStorage.getItem("accessToken")) return sessionStorage;
  if (localStorage.getItem("refreshToken") || localStorage.getItem("accessToken")) return localStorage;
  return localStorage;
}

function setAccessToken(accessToken: string) {
  const storage = getSessionStorage();
  storage.setItem("accessToken", accessToken);
  const otherStorage = storage === localStorage ? sessionStorage : localStorage;
  otherStorage.removeItem("accessToken");
}

function notifySessionExpired() {
  clearSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  refreshRequest ??= fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = (await res.json()) as RefreshResponse;
      if (!data.accessToken) return null;
      setAccessToken(data.accessToken);
      return data.accessToken;
    })
    .catch(() => null)
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

function buildHeaders(options: RequestInit, token: string | null) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function send(path: string, options: RequestInit, token: string | null) {
  return fetch(`${API_URL}${path}`, { ...options, headers: buildHeaders(options, token) });
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await send(path, options, getToken());
  const canRefresh = path !== "/auth/login" && path !== "/auth/refresh";

  if (res.status === 401 && canRefresh) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) res = await send(path, options, refreshedToken);
    if (!refreshedToken || res.status === 401) notifySessionExpired();
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const crud = {
  list: <T>(name: string) => api<T[]>(`/${name}`),
  create: <T>(name: string, data: unknown) => api<T>(`/${name}`, { method: "POST", body: JSON.stringify(data) }),
  update: <T>(name: string, id: string, data: unknown) => api<T>(`/${name}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (name: string, id: string) => api<void>(`/${name}/${id}`, { method: "DELETE" })
};
