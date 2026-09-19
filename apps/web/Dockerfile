FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY package*.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY tsconfig.json ./
RUN npm install
RUN npm run build -w packages/shared
RUN npm run build -w apps/web

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web ./apps/web
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "apps/web"]
