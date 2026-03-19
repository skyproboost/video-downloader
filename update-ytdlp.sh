#!/usr/bin/env bash
# update-ytdlp.sh — updates yt-dlp binary inside running Docker containers
#
# Usage:   ./scripts/update-ytdlp.sh
# Crontab: 0 3 * * 1 /home/gera/Projects/Python/video-downloader/scripts/update-ytdlp.sh

set -uo pipefail

YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_musllinux.zip"
YTDLP_PATH="/usr/bin/yt-dlp"
YTDLP_DIR=$(dirname "$YTDLP_PATH")
LOG_FILE="/home/gera/Projects/Python/video-downloader/ytdlp-update.log"
CONTAINERS=("downloader-api" "downloader-worker" "downloader-scheduler")

DOCKER=$(command -v docker)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

mkdir -p "$(dirname "$LOG_FILE")"

log "=== yt-dlp update started ==="

for container in "${CONTAINERS[@]}"; do
    if ! "$DOCKER" ps --format '{{.Names}}' | grep -qx "$container"; then
        log "SKIP  $container — not running"
        continue
    fi

    log "UPDATE $container — downloading latest binary..."

    if "$DOCKER" exec "$container" sh -c "
        set -e
        TMPDIR=\$(mktemp -d) &&
        trap 'rm -rf \"\$TMPDIR\"' EXIT &&
        wget -q '${YTDLP_URL}' -O \"\$TMPDIR/yt-dlp.zip\" &&
        python3 -c \"import zipfile; zipfile.ZipFile('\$TMPDIR/yt-dlp.zip').extractall('\$TMPDIR/out')\" &&
        chmod +x \"\$TMPDIR/out/yt-dlp_musllinux\" &&
        mv \"\$TMPDIR/out/yt-dlp_musllinux\" '${YTDLP_PATH}' &&
        rm -rf '${YTDLP_DIR}/_internal' &&
        mv \"\$TMPDIR/out/_internal\" '${YTDLP_DIR}/_internal'
    "; then
        version=$("$DOCKER" exec "$container" yt-dlp --version 2>/dev/null || echo "unknown")
        log "OK    $container — updated to $version"
    else
        log "ERROR $container — update failed"
    fi
done

log "=== yt-dlp update finished ==="
