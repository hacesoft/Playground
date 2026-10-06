#!/bin/sh
set -eu

APP_ID="hc_shared_app_core_playground"
WEB_CONTAINER=""
say(){ printf '%s\n' "$*"; }
die(){ printf 'ERROR: %s\n' "$*" >&2; exit 1; }
container_has_occ(){ docker exec "$1" sh -c 'test -f /var/www/html/occ' >/dev/null 2>&1; }

[ "$(id -u)" -eq 0 ] || die "Run this uninstaller with: sudo sh uninstall.sh"
command -v docker >/dev/null 2>&1 || die "Docker was not found."

if docker ps --format '{{.Names}}' | grep -qx 'nextcloud-app' \
  && container_has_occ nextcloud-app; then
  WEB_CONTAINER="nextcloud-app"
fi

if [ -z "$WEB_CONTAINER" ]; then
  for container in $(docker ps --format '{{.Names}}' | grep -Ei 'nextcloud' || true); do
    case "$container" in *cron*) continue;; esac
    if container_has_occ "$container"; then WEB_CONTAINER="$container"; break; fi
  done
fi

[ -n "$WEB_CONTAINER" ] || die "Could not find the Nextcloud web container."
docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ app:disable "$APP_ID" || true
docker exec "$WEB_CONTAINER" php -r \
  'if (function_exists("opcache_reset")) { opcache_reset(); }' >/dev/null 2>&1 || true

say "Core Playground was disabled."
say "Application files and configuration were preserved."
