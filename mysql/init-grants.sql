-- MySQL runs this script to initialize database grants

-- ERROR 1227 (42000) at line 20: Access denied; you need (at least one of) the SUPER, SYSTEM_VARIABLES_ADMIN or SESSION_VARIABLES_ADMIN privilege(s) for this operation
-- MySQL Grants for admin user for data dump import
GRANT SUPER, SYSTEM_VARIABLES_ADMIN, SESSION_VARIABLES_ADMIN ON *.* TO 'admin'@'%';
FLUSH PRIVILEGES;