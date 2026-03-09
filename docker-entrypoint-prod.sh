#!/bin/sh
set -e

PGDATA="/var/lib/postgresql/data"
DB_NAME="finopenpos"
DB_USER="finopenpos"
DB_PASS="${POSTGRES_PASSWORD:-finopenpos}"

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

# Ensure PGDATA ownership (volume may mount as root)
chown -R postgres:postgres ${PGDATA} /run/postgresql

# Init cluster if empty (first run with fresh volume)
if [ ! -f "${PGDATA}/PG_VERSION" ]; then
  su postgres -c "initdb -D ${PGDATA} --auth=trust"
  echo "local all all trust" > ${PGDATA}/pg_hba.conf
  echo "host all all 127.0.0.1/32 trust" >> ${PGDATA}/pg_hba.conf
  echo "host all all ::1/128 trust" >> ${PGDATA}/pg_hba.conf
fi

# Start PostgreSQL
touch /var/log/postgresql.log && chown postgres:postgres /var/log/postgresql.log
su postgres -c "pg_ctl -D ${PGDATA} -l /var/log/postgresql.log start -w"

# Create user and database if they don't exist
su postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'\" | grep -q 1 \
  || psql -c \"CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}'\""
su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\" | grep -q 1 \
  || psql -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}\""

# Push schema
bun drizzle-kit push

# Start Next.js
exec bun next start
