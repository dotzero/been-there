#!/bin/sh
set -eu

token=${MAPBOX_TOKEN:-}
json_token=$(printf '%s' "$token" | sed 's/\\/\\\\/g; s/'\''/\\'\''/g')
sed_token=$(printf '%s' "$json_token" | sed 's/[&|]/\\&/g')

sed -i "s|__MAPBOX_TOKEN__|$sed_token|g" /usr/share/nginx/html/index.html
