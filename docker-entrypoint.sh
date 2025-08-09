#!/bin/sh
set -e

DB_FILE="/app/DB/database.sqlite"

if [ ! -f "$DB_FILE" ]; then
  echo "Database not found. Running initial setup..."
  node database.js
else
  echo "Database already exists. Skipping setup."
fi

exec "$@"