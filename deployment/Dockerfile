FROM node:18-alpine AS builder

WORKDIR /app

COPY .. .

RUN npm install
RUN npm run build

FROM nginx:stable-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html
COPY deployment/default.conf /etc/nginx/conf.d/default.conf

COPY deployment/env.sh /docker-entrypoint.d/env.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
