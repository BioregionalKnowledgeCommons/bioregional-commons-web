-- BKC Auth Schema
-- Database: bkc_auth (separate from KOI knowledge graphs)
-- Run: psql bkc_auth < migrations/001_auth_tables.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username     VARCHAR(64) UNIQUE NOT NULL,
  display_name VARCHAR(128),
  email        VARCHAR(256),
  role         VARCHAR(20) NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('viewer','contributor','steward','admin')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE commons_memberships (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id  VARCHAR(64) NOT NULL,
  role     VARCHAR(20) NOT NULL DEFAULT 'viewer'
           CHECK (role IN ('viewer','contributor','steward')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, node_id)
);

CREATE TABLE credentials (
  id          VARCHAR(512) PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key  BYTEA NOT NULL,
  counter     BIGINT NOT NULL DEFAULT 0,
  transports  TEXT[],
  device_type VARCHAR(32),
  backed_up   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used   TIMESTAMPTZ
);
CREATE INDEX idx_credentials_user ON credentials(user_id);

CREATE TABLE challenges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge  VARCHAR(512) NOT NULL,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(20) NOT NULL CHECK (type IN ('registration','authentication')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes')
);
CREATE INDEX idx_challenges_expires ON challenges(expires_at);

CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked    BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_hash ON sessions(token_hash);
