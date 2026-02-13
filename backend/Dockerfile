FROM ghcr.io/astral-sh/uv:python3.12-alpine

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PYTHON_PREFERENCE=only-system \
    UV_SYSTEM_PYTHON=1 \
    UV_FROZEN=1 \
    UV_COMPILE_BYTECODE=1

# Install ffmpeg for video/audio merging
RUN apk update && apk add --no-cache ffmpeg

# Copying requirements of a project
COPY pyproject.toml /app/src/
COPY uv.lock /app/src/
WORKDIR /app/src

# Installing requirements
RUN uv sync --no-dev
COPY . /app/src/
RUN uv build .

CMD uv run --no-dev alembic upgrade head && \
    uv run --no-dev python -m app deploy && \
    uv run --no-dev python -m app run
