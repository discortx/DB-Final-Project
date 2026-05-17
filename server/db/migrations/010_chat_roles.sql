-- Migration 010: Add role column to chat_members
-- Run this in your Supabase SQL editor or psql before deploying.

ALTER TABLE chat_members
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'MEMBER';
