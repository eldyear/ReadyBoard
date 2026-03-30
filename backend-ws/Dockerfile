# ── Build stage ────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./main.go

# ── Production stage ────────────────────────────────────────────
FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/server /app/server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

ENV PORT=8081
EXPOSE 8081
ENTRYPOINT ["/app/server"]
