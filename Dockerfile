# syntax=docker/dockerfile:1

# --- build stage: install all deps and compile the Nest app -------------------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# If your stack needs a codegen step before build (e.g. Prisma), add it here:
#   RUN npx prisma generate
RUN npm run build

# --- production stage: prod deps only + compiled output ----------------------
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node --from=build /app/dist ./dist

# Drop root: run the app as the unprivileged `node` user baked into the image.
USER node

EXPOSE 3000
CMD ["node", "dist/main"]
