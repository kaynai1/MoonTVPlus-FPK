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
    if [ ! -s "$IMAGE_TAR" ]; then
        echo "ERROR: 离线版缺少镜像文件 $IMAGE_TAR" >&2
        exit 1
    fi
    # 镜像压缩后再打包：解包后只占约 300MB，避免小容量系统盘被 1GB+ tar 撑爆
    case "$IMAGE_TAR" in
        *.gz) cp "$IMAGE_TAR" "$STAGE/app/docker/moontvplus-image.tar.gz" ;;
        *)    gzip -c "$IMAGE_TAR" > "$STAGE/app/docker/moontvplus-image.tar.gz" ;;
    esac
    # 不再写 pull_policy: never —— 内嵌镜像 load 失败时允许 compose 回退在线拉取，
    # 否则只会报 "No such image"，用户完全不知道发生了什么
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
