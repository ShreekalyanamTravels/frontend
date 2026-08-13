-- Run this manually against the application database before deploying the route that writes to
-- it (app/api/v1/notifications/register-token).
-- Stores the mobile app's Expo push token, set after the user grants notification permission.

ALTER TABLE users ADD COLUMN push_token VARCHAR(255) NULL;
