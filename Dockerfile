# Builds the Expo app's web target (react-native-web) into a static SPA
# and serves it with nginx. Native iOS/Android builds do NOT use this file —
# those go through EAS Build. See README / deploy docs.

# -------- Builder Stage --------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# The API origin is baked into the static bundle at build time.
# Pass these as Easypanel build args (NOT runtime env — a static SPA has no runtime env).
#   APP_VARIANT=prod
#   API_ORIGIN_PROD=https://api.your-domain.com
ARG APP_VARIANT=prod
ARG API_ORIGIN_PROD
ARG API_ORIGIN_STAGING
ENV APP_VARIANT=$APP_VARIANT
ENV API_ORIGIN_PROD=$API_ORIGIN_PROD
ENV API_ORIGIN_STAGING=$API_ORIGIN_STAGING

# Export the web bundle to ./dist
RUN npx expo export --platform web --output-dir dist

# -------- Serve Stage --------
FROM nginx:alpine

# SPA routing config (expo-router deep links fall back to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static bundle
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
