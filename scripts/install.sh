#!/usr/bin/env bash
set -euo pipefail

# Open POS Printer Emulator - development installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/darkterminal/open-pos-printer-emulator/main/scripts/install.sh | bash
#
# Environment variables:
#   OPPE_DIR      Install directory (default: ./open-pos-printer-emulator)
#   OPPE_ENGINE   Container engine: kiri or docker (default: auto-detect, prefers kiri)
#   OPPE_BRANCH   Git branch/tag to checkout (default: main)
#   OPPE_REPO     Git repository URL (default: https://github.com/darkterminal/open-pos-printer-emulator.git)
#   OPPE_NO_START Set to 1 to clone/prepare only, skip starting containers

REPO_URL="${OPPE_REPO:-https://github.com/darkterminal/open-pos-printer-emulator.git}"
BRANCH="${OPPE_BRANCH:-main}"
INSTALL_DIR="${OPPE_DIR:-open-pos-printer-emulator}"
NO_START="${OPPE_NO_START:-0}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '\033[36m[oppe]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[oppe]\033[0m %s\n' "$*"; }
err() { printf '\033[31m[oppe]\033[0m %s\n' "$*" >&2; }
die() { err "$*"; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

detect_engine() {
  if [ -n "${OPPE_ENGINE:-}" ]; then
    case "$OPPE_ENGINE" in
      kiri|docker) echo "$OPPE_ENGINE"; return 0 ;;
      *) die "Invalid OPPE_ENGINE='$OPPE_ENGINE' (expected kiri or docker)" ;;
    esac
  fi
  if command -v kiri >/dev/null 2>&1; then
    echo "kiri"
  elif command -v docker >/dev/null 2>&1; then
    echo "docker"
  else
    die "Neither 'kiri' nor 'docker' was found. Install one of them first."
  fi
}

compose_cmd() {
  local engine="$1"
  if [ "$engine" = "docker" ]; then
    echo "docker compose"
  else
    echo "kiri compose"
  fi
}

bold "Open POS Printer Emulator installer"
info "Development tool only - not recommended for production deployment."

need_cmd git
need_cmd curl

ENGINE="$(detect_engine)"
COMPOSE="$(compose_cmd "$ENGINE")"
info "Using container engine: $ENGINE"

if [ -d "$INSTALL_DIR/.git" ]; then
  info "Existing repository found at '$INSTALL_DIR', updating..."
  git -C "$INSTALL_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH" || warn "Could not fast-forward; leaving current local state."
else
  info "Cloning $REPO_URL ($BRANCH) into '$INSTALL_DIR'..."
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

[ -f apps/web/.env ] || cp apps/web/.env.example apps/web/.env
[ -f apps/sidecar/.env ] || cp apps/sidecar/.env.example apps/sidecar/.env

if [ "$NO_START" = "1" ]; then
  info "OPPE_NO_START=1 set; skipping container startup."
  exit 0
fi

info "Starting stack with $ENGINE..."
# shellcheck disable=SC2086
$COMPOSE up -d --build

info "Installing web dependencies..."
# shellcheck disable=SC2086
$COMPOSE exec -T web composer install --no-interaction --prefer-dist

info "Generating app key if missing..."
# shellcheck disable=SC2086
$COMPOSE exec -T web php artisan key:generate --force --ansi || true

info "Running migrations and seeders..."
# shellcheck disable=SC2086
$COMPOSE exec -T web php artisan migrate --seed --force --ansi

bold "Installation complete"
cat <<EOF

Web UI:          http://localhost:8080
Jobs:            http://localhost:8080/jobs
Reverb:          ws://localhost:8081
TCP listener:    localhost:9100
Sidecar health:  http://localhost:3001/health

Default local login:
  Email:    admin@example.com
  Password: password

Quick test:
  printf "\\x1B\\x40Hello ESC/POS\\n\\x1D\\x56\\x00" | nc 127.0.0.1 9100

Useful commands (from $INSTALL_DIR):
  make ps ENGINE=$ENGINE
  make logs ENGINE=$ENGINE
  make down ENGINE=$ENGINE

EOF
