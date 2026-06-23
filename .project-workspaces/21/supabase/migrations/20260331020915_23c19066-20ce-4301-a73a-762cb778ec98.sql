
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS home_address text NULL,
ADD COLUMN IF NOT EXISTS home_lat double precision NULL,
ADD COLUMN IF NOT EXISTS home_lon double precision NULL,
ADD COLUMN IF NOT EXISTS work_address text NULL,
ADD COLUMN IF NOT EXISTS work_lat double precision NULL,
ADD COLUMN IF NOT EXISTS work_lon double precision NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_home_coords ON profiles(home_lat, home_lon) WHERE home_lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_work_coords ON profiles(work_lat, work_lon) WHERE work_lat IS NOT NULL;
