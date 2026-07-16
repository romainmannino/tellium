#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/standalone"
export HOSTNAME=0.0.0.0
export PORT=${PORT:-3000}
node server.js
