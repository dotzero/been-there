#!/bin/sh
set -eu

token=${MAPBOX_TOKEN:-}
escaped_token=$(printf '%s' "$token" | sed 's/\\/\\\\/g; s/"/\\"/g')

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  MAPBOX_TOKEN: "$escaped_token"
};
EOF
