# ── Build stage ────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Cache dependencies
COPY backend-api/go.mod backend-api/go.sum ./
RUN go mod download

# Copy source and build
COPY backend-api/ .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./main.go

# ── Production stage ────────────────────────────────────────────
FROM alpine:3.19

WORKDIR /app

# Copy migrations into the final image
COPY --from=builder /app/server /app/server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Migrations are mounted from the repo root via env var, but we also
# bundle them here as a fallback
COPY backend-api/migrations /app/migrations
COPY themes /app/themes

ENV MIGRATIONS_PATH=file:///app/migrations
ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["/app/server"]
