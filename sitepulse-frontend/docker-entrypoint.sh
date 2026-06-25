#!/bin/sh
set -eu

BACKEND_URL="${VITE_BACKEND_BASE_URL:-${BACKEND_BASE_URL:-http://localhost:4000}}"
BACKEND_URL="${BACKEND_URL%/}"

node -e 'const backendBaseUrl = process.argv[1]; process.stdout.write(`window.__SITEPULSE_CONFIG__=${JSON.stringify({ backendBaseUrl })};\n`);' "$BACKEND_URL" > /app/dist/sitepulse-config.js

exec serve -s /app/dist -l "${PORT:-3000}"
