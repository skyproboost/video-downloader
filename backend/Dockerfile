FROM ghcr.io/astral-sh/uv:python3.12-alpine

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PYTHON_PREFERENCE=only-system \
    UV_SYSTEM_PYTHON=1 \
    UV_FROZEN=1 \
    UV_COMPILE_BYTECODE=1

# Install ffmpeg and Deno (JS runtime required by yt-dlp for YouTube)
#RUN apk update && apk add --no-cache ffmpeg curl unzip && \
#    curl -fsSL https://github.com/denoland/deno/releases/latest/deno-x86_64-unknown-linux-musl.zip -o /tmp/deno.zip && \
#    unzip /tmp/deno.zip -d /usr/local/bin && \
#    rm /tmp/deno.zip && \
#    chmod +x /usr/local/bin/deno
RUN apk update && apk add --no-cache ffmpeg

# Copying requirements of a project
COPY pyproject.toml /app/src/
COPY uv.lock /app/src/
WORKDIR /app/src

# Installing requirements
RUN uv sync --no-dev
COPY . /app/src/
RUN uv build .

# TODO: restore when DB is needed
# CMD uv run --no-dev alembic upgrade head && \
#     uv run --no-dev python -m app deploy && \
#     uv run --no-dev python -m app run
CMD uv run --no-dev python -m app run
