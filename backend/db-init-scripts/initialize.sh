#!/bin/bash
set -e

# Use environment variables to create the read-only proot user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create the read-only user
    CREATE USER proot WITH PASSWORD '${APP_DB_PROOT_PASS}';

    -- Grant connect and usage permissions
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO proot;
    GRANT USAGE ON SCHEMA public TO proot;

    -- Grant read-only permissions to existing tables
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO proot;
    GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO proot;

    -- Set up default privileges for future tables and sequences
    ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT ON TABLES TO proot;
    
    ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT ON SEQUENCES TO proot;
EOSQL