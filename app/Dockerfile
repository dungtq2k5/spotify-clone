FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod --ignore-scripts

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/prisma.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
# Apply migrations, optionally seed demo data (idempotent), then start.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && if [ \"$SEED_MOCK\" = true ]; then node_modules/.bin/tsx prisma/seed.ts --mock; fi && exec node dist/main"]
