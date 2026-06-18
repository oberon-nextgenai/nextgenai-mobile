# Builds the Expo app's web target (react-native-web) into a static SPA
# and serves it with nginx. Native iOS/Android builds do NOT use this file —
# those go through EAS Build. See README / deploy docs.

# -------- Builder Stage --------
# Debian-based (glibc), not alpine/musl: lightningcss (used by the CSS pipeline)
# ships prebuilt linux-x64-gnu binaries; the musl variant isn't in the lockfile.
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies first for better layer caching.
# Copy ONLY package.json (not the lockfile): the committed lockfile is authored on
# Windows and records only win32 native binaries, so installing against it leaves out
# the Linux builds of platform-specific deps (e.g. lightningcss). Omitting it lets npm
# resolve the correct linux-x64-gnu binaries fresh.
# --legacy-peer-deps: react-native-worklets@0.8.3 declares a peer of RN 0.81-0.85
# but this project pins RN 0.79.6 (Expo SDK 53), so strict resolution fails.
COPY package.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

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
