#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
SRC="$ROOT/src"
INFO="$SRC/appinfo/info.xml"
[ -f "$INFO" ] || { echo "ERROR: $INFO not found" >&2; exit 1; }
APP_ID="$(sed -n 's:.*<id>\([^<]*\)</id>.*:\1:p' "$INFO" | head -n 1)"
VERSION="$(sed -n 's:.*<version>\([^<]*\)</version>.*:\1:p' "$INFO" | head -n 1)"
[ -f "$ROOT/scripts/custom-apps-safety.sh" ] || { echo "ERROR: installer helper is missing" >&2; exit 1; }
[ -n "$APP_ID" ] || { echo "ERROR: app id not found" >&2; exit 1; }
[ -n "$VERSION" ] || { echo "ERROR: version not found" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm was not found" >&2; exit 1; }
cd "$ROOT/build"
npm ci
npm run check
npm run build
RUNTIME_ITEMS="appinfo css img js lib templates"
for item in $RUNTIME_ITEMS; do [ -e "$SRC/$item" ] || { echo "ERROR: missing src/$item" >&2; exit 1; }; done
STAGE="$ROOT/.build"; APP="$STAGE/$APP_ID"; SOURCE="$STAGE/hc-shared-app-core-playground-$VERSION"; RELEASE="$ROOT/release"
rm -rf "$STAGE"; mkdir -p "$APP" "$SOURCE" "$RELEASE"
# release/ contains generated output only; keep one current runtime version.
find "$RELEASE" -maxdepth 1 -type f \( -name "$APP_ID-*.zip" -o -name "$APP_ID-*.tar.gz" \) -delete
find "$RELEASE" -maxdepth 1 -type f -name 'hc-shared-app-core-playground-*-full-source.zip' -delete
for item in $RUNTIME_ITEMS; do cp -R "$SRC/$item" "$APP/$item"; done
cp "$ROOT/LICENSE" "$APP/LICENSE"
(cd "$ROOT" && tar --exclude='build/node_modules' -cf - .gitignore LICENSE README.md README_CZ.md install.sh uninstall.sh build-release.sh build docs scripts src) | (cd "$SOURCE" && tar -xf -)
(
 cd "$STAGE"
 tar -czf "$RELEASE/$APP_ID-$VERSION.tar.gz" "$APP_ID"
 if command -v zip >/dev/null 2>&1; then zip -qr "$RELEASE/$APP_ID-$VERSION.zip" "$APP_ID"; fi
 if command -v zip >/dev/null 2>&1; then zip -qr "$RELEASE/hc-shared-app-core-playground-$VERSION-full-source.zip" "hc-shared-app-core-playground-$VERSION"; fi
)
if [ -f "$RELEASE/hc-shared-app-core-playground-$VERSION-full-source.zip" ]; then
 unzip -p "$RELEASE/hc-shared-app-core-playground-$VERSION-full-source.zip" "hc-shared-app-core-playground-$VERSION/scripts/custom-apps-safety.sh" >/dev/null || { echo "ERROR: source archive lacks installer helper" >&2; exit 1; }
fi
rm -rf "$STAGE"
echo "Built release/$APP_ID-$VERSION.tar.gz"
[ -f "$RELEASE/$APP_ID-$VERSION.zip" ] && echo "Built release/$APP_ID-$VERSION.zip"
[ -f "$RELEASE/hc-shared-app-core-playground-$VERSION-full-source.zip" ] && echo "Built release/hc-shared-app-core-playground-$VERSION-full-source.zip"
