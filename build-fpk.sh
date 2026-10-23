#!/bin/bash
set -euo pipefail

# 手工构建 fnOS FPK（不依赖 fnpack）
# 用法: ./build-fpk.sh [online|offline]

VARIANT="${1:-online}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

VERSION="${VERSION:-$(awk -F'=' '/^version/{gsub(/ /,"",$2);print $2}' manifest)}"
VERSION="${VERSION#v}"
OUT_DIR="${OUT_DIR:-$ROOT/dist}"
mkdir -p "$OUT_DIR"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
STAGE="$WORK/pkg"
mkdir -p "$STAGE"

TAR_OWNER=""
if tar --version 2>/dev/null | head -1 | grep -qi "gnu tar"; then
    TAR_OWNER="--owner=0 --group=0"
fi

# ---- 包根目录 ----
cp manifest ICON.PNG ICON_256.PNG MoonTVPlus.sc "$STAGE/"
cp -r config wizard ui "$STAGE/"

# ---- app/（打进 app.tgz）----
mkdir -p "$STAGE/app/docker" "$STAGE/app/ui/images"
cp app/docker/docker-compose.yaml "$STAGE/app/docker/"
mkdir -p "$STAGE/app/docker/activation"
cp app/docker/activation/*.js app/docker/activation/*.html "$STAGE/app/docker/activation/"
cp ui/config "$STAGE/app/ui/"
cp ui/images/*.png "$STAGE/app/ui/images/"

if [ "$VARIANT" = "offline" ]; then
    IMAGE_TAR="${IMAGE_TAR:-$ROOT/moontvplus-image.tar}"
    if [ ! -f "$IMAGE_TAR" ]; then
        echo "ERROR: 离线版缺少镜像文件 $IMAGE_TAR" >&2
        exit 1
    fi
    cp "$IMAGE_TAR" "$STAGE/app/docker/moontvplus-image.tar"
    sed -i 's#ghcr.io/kaynai1/moontvplus-fpk:latest#ghcr.io/kaynai1/moontvplus-fpk:embedded#' \
        "$STAGE/app/docker/docker-compose.yaml"
    sed -i 's#^    restart: unless-stopped#    restart: unless-stopped\n    pull_policy: never#' \
        "$STAGE/app/docker/docker-compose.yaml"
fi

# ---- app.tgz ----
( cd "$STAGE/app" && tar $TAR_OWNER -czf "$STAGE/app.tgz" docker ui )
rm -rf "$STAGE/app"

CHECKSUM="$(md5sum "$STAGE/app.tgz" | awk '{print $1}')"
sed -i "s/^checksum .*/checksum        = $CHECKSUM/" "$STAGE/manifest"
sed -i "s/^fpk_version .*/fpk_version     = $VERSION/" "$STAGE/manifest"
sed -i "s/^version .*/version         = $VERSION/" "$STAGE/manifest"

# ---- 生命周期脚本 ----
cp -r cmd "$STAGE/cmd"
chmod +x "$STAGE"/cmd/*

NAME="moontvplus_${VERSION}_${VARIANT}.fpk"
( cd "$STAGE" && tar $TAR_OWNER -czf "$OUT_DIR/$NAME" \
    manifest ICON.PNG ICON_256.PNG MoonTVPlus.sc app.tgz cmd config ui wizard )

echo "==> $OUT_DIR/$NAME"
ls -lh "$OUT_DIR/$NAME"
echo "==> md5(app.tgz) = $CHECKSUM"
