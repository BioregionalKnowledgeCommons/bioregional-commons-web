"use client";

import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { apiPath } from "@/lib/constants";
import type { AuthUser } from "@/types/auth";

async function jsonPost(path: string, body: unknown) {
  const res = await fetch(apiPath(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function register(
  username: string,
  displayName?: string
): Promise<AuthUser> {
  const options = await jsonPost("/api/auth/register/options", {
    username,
    displayName,
  });

  const credential = await startRegistration({ optionsJSON: options });

  const result = await jsonPost("/api/auth/register/verify", {
    credential,
    username,
    displayName,
  });

  return result.user;
}

export async function login(username?: string): Promise<AuthUser> {
  const options = await jsonPost("/api/auth/login/options", {
    username,
  });

  const credential = await startAuthentication({ optionsJSON: options });

  const result = await jsonPost("/api/auth/login/verify", {
    credential,
  });

  return result.user;
}

export async function logout(): Promise<void> {
  await fetch(apiPath("/api/auth/session"), {
    method: "DELETE",
    credentials: "same-origin",
  });
}

export async function fetchSession(): Promise<AuthUser | null> {
  const res = await fetch(apiPath("/api/auth/session"), {
    credentials: "same-origin",
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.authenticated) return null;
  return data.user;
}
