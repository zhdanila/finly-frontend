#!/bin/sh

cat <<EOF > /usr/share/nginx/html/env.js
window.env = {
  BACKEND_URL: "$BACKEND_URL"
};
EOF
