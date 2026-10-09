// The staff portal's client for ws. Farmers never call ws: their chats stay on the phone.
import { DEFAULT_WS_URL, loadAdminToken } from '../config/ws';

export type Address = {
  line1: string;
  line2: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
};

export type UserDTO = {
  id: string;
  role: string;
  status: string;
  email?: string;
  fullName: string;
  phone?: string;
  deviceId?: string;
  age?: number;
  birthDate?: string;
  consentAt?: string;
  createdAt: string;
  address?: Address;
  invite?: InviteDTO;
};

export type InviteDTO = {
  id: string;
  userId: string;
  claimUrl: string;
  expiresAt: string;
  singleUse: boolean;
};

export type AuditDTO = {
  id: string;
  eventType: string;
  actorId: string;
  subjectId: string;
  metadata: unknown;
  createdAt: string;
};

export class WsApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type AuthMode = boolean | 'admin';

async function request<T>(
  path: string,
  opts: RequestInit & { auth?: AuthMode } = {},
): Promise<T> {
  const headers = new Headers(opts.headers);
  if (!headers.has('Content-Type') && opts.body) {
    headers.set('Content-Type', 'application/json');
  }
  const mode = opts.auth === undefined ? 'admin' : opts.auth;
  if (mode !== false) {
    const token = loadAdminToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${DEFAULT_WS_URL}${path}`, { ...opts, headers });
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { error: text };
    }
  }
  if (!res.ok) {
    const msg =
      parsed && typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : res.statusText;
    throw new WsApiError(res.status, msg || 'request failed');
  }
  // ws response.JSON wraps payloads as { data: T }
  if (parsed && typeof parsed === 'object' && parsed !== null && 'data' in parsed) {
    return (parsed as { data: T }).data;
  }
  return parsed as T;
}

export function login(email: string, password: string) {
  return request<{ token: string; user: UserDTO }>('/api/v1/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });
}

export function me() {
  return request<UserDTO>('/api/v1/auth/me');
}

export function listUsers(q?: string, status?: string) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  const qs = params.toString();
  return request<UserDTO[]>(`/api/v1/users${qs ? `?${qs}` : ''}`);
}

export function getUser(id: string) {
  return request<UserDTO>(`/api/v1/users/${id}`);
}

export type RegisterBody = {
  fullName: string;
  birthDate: string;
  address: Address;
  phone?: string;
  idNumber?: string;
  consentAt?: string;
};

export function registerUser(body: RegisterBody) {
  return request<UserDTO>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function createInvite(userId: string) {
  return request<InviteDTO>(`/api/v1/users/${userId}/invites`, { method: 'POST' });
}

export function regenerateInvite(userId: string) {
  return request<InviteDTO>(`/api/v1/users/${userId}/invites/regenerate`, { method: 'POST' });
}

export function revokeInvite(inviteId: string) {
  return request<{ status: string }>(`/api/v1/invites/${inviteId}/revoke`, { method: 'POST' });
}

export function revokeUser(userId: string) {
  return request<{ status: string }>(`/api/v1/users/${userId}/revoke`, { method: 'POST' });
}

export function listAudit() {
  return request<AuditDTO[]>('/api/v1/audit');
}
