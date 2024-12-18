# Build stage
FROM node:20-alpine AS builder

# Use alpine-based image and install only necessary dependencies
RUN apk add --no-cache openssl

WORKDIR /app

# Only needed for prisma build
ARG DATABASE_URL

# Copy only necessary files for dependency installation
COPY package.json yarn.lock ./
COPY prisma ./prisma/

RUN yarn install --frozen-lockfile \
  && yarn prisma:generate \
  && yarn cache clean

# Copy source files and build
COPY . .
RUN yarn run build

# Production stage
FROM node:20-alpine

LABEL maintainer="FAIR Data Innovations Hub <contact@fairdataihub.org>" \
  description="A better log watcher!"

RUN apk add --no-cache openssl

WORKDIR /app

# Copy only the necessary files from builder stage
COPY --from=builder /app/.output ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD [ "node", "/app/server/index.mjs" ]
