#!/bin/bash

# MoonTVPlus FPK Build Script
# This script builds the Docker image and creates the FPK package

set -e

APP_NAME="moontvplus"
VERSION="1.0.0"
IMAGE_NAME="moontvplus/moontvplus-fpk"
IMAGE_TAG="latest"

echo "========================================="
echo "  MoonTVPlus FPK Build Script"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

# Check if fnpack is installed
if ! command -v fnpack &> /dev/null; then
    echo "Warning: fnpack is not installed. Will only build Docker image."
    echo "Install fnpack from: https://developer.fnnas.com/"
    SKIP_FPK=true
else
    SKIP_FPK=false
fi

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FPK_DIR="$SCRIPT_DIR"

echo "Build directory: $FPK_DIR"
echo ""

# Step 1: Build Docker image
echo "Step 1: Building Docker image..."
echo "  Image: $IMAGE_NAME:$IMAGE_TAG"
echo ""

cd "$FPK_DIR/app/docker"

# Clone MoonTVPlus source if not present
if [ ! -f "package.json" ]; then
    echo "  Cloning MoonTVPlus source..."
    cd /tmp
    git clone --depth 1 https://github.com/mtvpls/MoonTVPlus.git
    cp -r MoonTVPlus/* "$FPK_DIR/app/docker/"
    cd "$FPK_DIR/app/docker"
fi

# Build the image
docker build -t "$IMAGE_NAME:$IMAGE_TAG" .

echo ""
echo "  ✓ Docker image built successfully"
echo ""

# Step 2: Create FPK package (if fnpack is available)
if [ "$SKIP_FPK" = false ]; then
    echo "Step 2: Creating FPK package..."
    echo ""

    cd "$FPK_DIR"

    # Build FPK
    fnpack build

    echo ""
    echo "  ✓ FPK package created: ${APP_NAME}.fpk"
    echo ""
else
    echo "Step 2: Skipping FPK creation (fnpack not installed)"
    echo ""
    echo "  To create FPK package manually:"
    echo "  1. Install fnpack from https://developer.fnnas.com/"
    echo "  2. Run: cd $FPK_DIR && fnpack build"
    echo ""
fi

# Step 3: Push Docker image (optional)
echo "Step 3: Push Docker image to registry (optional)..."
echo ""
echo "  To push the image:"
echo "  docker tag $IMAGE_NAME:$IMAGE_TAG $IMAGE_NAME:v$VERSION"
echo "  docker push $IMAGE_NAME:v$VERSION"
echo ""

echo "========================================="
echo "  Build Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Upload ${APP_NAME}.fpk to fnOS App Center"
echo "2. Or install locally: appcenter-cli install-local ${APP_NAME}.fpk"
echo ""
