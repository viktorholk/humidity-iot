FROM rust:alpine as builder

WORKDIR /app/src
RUN USER=root

RUN apk add gcc make  pkgconfig perl openssl-dev libc-dev
COPY ./ ./
RUN cargo build --release

FROM alpine:latest
WORKDIR /app
RUN apk update \
    && apk add openssl ca-certificates

COPY --from=builder /app/src/target/release/backend /app/backend

COPY migrations ./migrations

EXPOSE 3000

CMD ["/app/backend"]
