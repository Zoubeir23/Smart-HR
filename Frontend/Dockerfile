# Stage 1 — Build React app
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ARG VITE_SITE_URL
ARG VITE_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN

ENV VITE_API_URL=${VITE_API_URL} \
    VITE_SITE_URL=${VITE_SITE_URL} \
    VITE_SENTRY_DSN=${VITE_SENTRY_DSN} \
    SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

COPY package*.json ./
RUN npm ci --silent

COPY . .

RUN npm run build

# Stage 2 — Serve with nginx
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.vps.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
