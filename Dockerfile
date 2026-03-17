# syntax=docker/dockerfile:1

FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ARG PUBLIC_URL=/
ARG REACT_APP_API_BASE=/api
ENV PUBLIC_URL=${PUBLIC_URL}
ENV REACT_APP_API_BASE=${REACT_APP_API_BASE}
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY config ./config
COPY middleware ./middleware
COPY models ./models
COPY routes ./routes
COPY server.js ./server.js
COPY seed.js ./seed.js
RUN mkdir -p ./uploads ./uploads/cvs ./uploads/profile_pics ./uploads/excel

RUN mkdir -p frontend
COPY --from=frontend-builder /app/frontend/build ./frontend/build

ENV NODE_ENV=production
ENV PORT=5009
ENV APP_BASE_PATH=
EXPOSE 5009

CMD ["node", "server.js"]
