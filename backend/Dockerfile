FROM rust:alpine as builder

WORKDIR /app/src
RUN USER=root

RUN apk add gcc make  pkgconfig perl openssl-dev libc-dev
COPY ./ ./
RUN cargo build --release

RUN cargo install sqlx-cli --no-default-features --features postgres

FROM alpine:latest
WORKDIR /app
RUN apk update \
    && apk add openssl ca-certificates

COPY --from=builder /app/src/target/release/backend .
COPY --from=builder /usr/local/cargo/bin/sqlx /usr/local/bin/sqlx
COPY migrations ./migrations

EXPOSE 3000

CMD ["sqlx migrate run"]

CMD ["backend"]
