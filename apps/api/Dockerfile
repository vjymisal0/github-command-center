FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

FROM base AS builder
COPY package*.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY tsconfig.json ./
RUN npm install
RUN rm -f packages/shared/tsconfig.tsbuildinfo && npm run build -w packages/shared
RUN npm run build -w apps/api

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "apps/api"]
