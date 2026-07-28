-- Revoke permissions
REVOKE ALL ON room_types FROM admin;
REVOKE SELECT ON room_types FROM service_role;
REVOKE SELECT ON room_types FROM authenticated;

-- Drop index
DROP INDEX IF EXISTS idx_room_types_name;

-- Drop table
DROP TABLE IF EXISTS room_types;
