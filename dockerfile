FROM golang:1.23-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download
COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/main.go


FROM alpine:latest

RUN apk --no-cache add ca-certificates wget

WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/.env* ./
RUN mkdir -p /app/logs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["./main"]
