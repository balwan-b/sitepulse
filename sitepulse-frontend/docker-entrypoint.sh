#!/bin/sh
set -eu

BACKEND_URL="${VITE_BACKEND_BASE_URL:-${BACKEND_BASE_URL:-http://localhost:4000}}"
BACKEND_URL="${BACKEND_URL%/}"
PUBLIC_API_BASE_URL="${PUBLIC_API_BASE_URL:-}"
PUBLIC_API_BASE_URL="${PUBLIC_API_BASE_URL%/}"

node -e 'const backendBaseUrl = process.argv[1]; process.stdout.write(`window.__SITEPULSE_CONFIG__=${JSON.stringify({ backendBaseUrl })};\n`);' "$PUBLIC_API_BASE_URL" > /app/dist/sitepulse-config.js

export BACKEND_URL

exec node /app/server.mjs
