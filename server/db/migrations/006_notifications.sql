-- Migration 006: Notifications

CREATE TABLE notifications (
  id           BIGSERIAL PRIMARY KEY,
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- ON DELETE SET NULL: notifications survive when the triggering user deletes their account
  sender_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  type         notification_type NOT NULL,
  text         TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index: fast lookup of unread notifications per user
CREATE INDEX idx_notif_recipient_unread ON notifications (recipient_id, is_read, created_at DESC)
  WHERE is_read = FALSE;
CREATE INDEX idx_notif_sender_id ON notifications (sender_id);
