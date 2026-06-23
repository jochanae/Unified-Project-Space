
-- Fix user_name to match preferred_name for user fee7a5cc
UPDATE profiles SET user_name = 'Jocy' WHERE user_id = 'fee7a5cc-a8fa-49b3-b506-291d3299cee6' AND user_name = 'Justin';

-- Delete stale matchmaking session so Cami restarts fresh with correct name
DELETE FROM matchmaking_sessions WHERE user_id = 'fee7a5cc-a8fa-49b3-b506-291d3299cee6';
