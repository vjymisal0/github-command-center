FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

FROM base AS builder
COPY package*.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker
COPY tsconfig.json ./
RUN npm ci --no-audit --fund=false
RUN npx prisma generate --schema packages/database/prisma/schema.prisma
RUN rm -f packages/shared/tsconfig.tsbuildinfo && npm run build -w packages/shared
RUN npm run build -w apps/worker

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/worker ./apps/worker
CMD ["npm", "run", "start", "-w", "apps/worker"]
