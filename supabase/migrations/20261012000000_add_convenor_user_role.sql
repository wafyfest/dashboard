-- Migration: 20261012000000_add_convenor_user_role.sql
-- Description: Adds 'convenor' role to user_role ENUM for Convenor portal access

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'convenor';
