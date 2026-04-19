# production build using Next.js
FROM node:18 AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund || npm install
COPY . .
# ensure leftover config files from previous scaffolds don't disable SWC
RUN rm -f .babelrc || true
RUN rm -f vite.config.js || true
RUN rm -rf src || true
# Install SWC dependencies for Linux
RUN npm install @next/swc-linux-x64-gnu
RUN npm run build

FROM node:18-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
EXPOSE 3000
CMD ["npm", "run", "start"]
