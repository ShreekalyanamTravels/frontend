-- Run this manually against the application database before using /api/v1/auth/*.
-- Backs the Bearer refresh-token flow used by the mobile API (app/lib/refreshTokens.ts).

CREATE TABLE IF NOT EXISTS api_refresh_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  family_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  device_label VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  replaced_by BIGINT UNSIGNED NULL,
  last_used_at DATETIME NULL,
  UNIQUE KEY uq_api_refresh_tokens_token_hash (token_hash),
  KEY idx_api_refresh_tokens_user (user_id),
  KEY idx_api_refresh_tokens_family (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
