#!/bin/sh

echo "window.env = {
  ENV: \"${ENV}\",
  BACKEND_URL: \"${BACKEND_URL}\"
};" > /usr/share/nginx/html/env.js
