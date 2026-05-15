-- Migration 009: Add rematch proposal tracking to tictactoe_matches
-- Run this in your Supabase SQL editor or psql before deploying the new routes.

ALTER TABLE tictactoe_matches
  ADD COLUMN IF NOT EXISTS rematch_proposed_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
