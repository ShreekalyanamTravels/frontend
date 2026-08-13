-- Run this manually against the application database before deploying the login routes that
-- write to it (app/api/v1/auth/login, app/api/v1/auth/login/mobile/verify-otp).
-- Stores the mobile app's per-installation device identifier, set on every successful login.

ALTER TABLE users ADD COLUMN device_id VARCHAR(255) NULL;
