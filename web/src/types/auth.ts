export interface AuthUser {
  id: string;
  username: string;
  displayName?: string;
}

export interface SessionPayload {
  sub: string;
  username: string;
  displayName?: string;
}
