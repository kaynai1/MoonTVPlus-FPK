#!/bin/bash

# MoonTVPlus FPK - GHCR Push Script
# 构建并推送 Docker 镜像到 GitHub Container Registry

set -e

GHCR_USERNAME="kaynai1"
IMAGE_NAME="moontvplus-fpk"
GHCR_REGISTRY="ghcr.io"
FULL_IMAGE_NAME="${GHCR_REGISTRY}/${GHCR_USERNAME}/${IMAGE_NAME}"

echo "========================================="
echo "  MoonTVPlus GHCR Push Script"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Warning: GitHub CLI (gh) is not installed."
    echo "Please install from: https://cli.github.com/"
    echo ""
    echo "You can manually login to GHCR:"
    echo "  echo YOUR_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
    echo ""
    exit 1
fi

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/app/docker"

echo "Script directory: $SCRIPT_DIR"
echo ""

# Step 1: Clone MoonTVPlus source if not present
echo "Step 1: Preparing MoonTVPlus source..."
echo ""

if [ ! -f "$DOCKER_DIR/package.json" ]; then
    echo "  Cloning MoonTVPlus source..."
    cd /tmp
    rm -rf MoonTVPlus
    git clone --depth 1 https://github.com/mtvpls/MoonTVPlus.git
    cp -r MoonTVPlus/* "$DOCKER_DIR/"
    rm -rf MoonTVPlus
    echo "  ✓ Source code cloned"
else
    echo "  ✓ Source code already present"
fi
echo ""

# Step 2: Login to GHCR
echo "Step 2: Logging in to GHCR..."
echo ""

# Use GitHub CLI to get token
GH_TOKEN=$(gh auth token 2>/dev/null)

if [ -z "$GH_TOKEN" ]; then
    echo "Error: Not logged in to GitHub CLI"
    echo "Please run: gh auth login"
    exit 1
fi

echo "$GH_TOKEN" | docker login "$GHCR_REGISTRY" -u "$GHCR_USERNAME" --password-stdin

if [ $? -eq 0 ]; then
    echo "  ✓ Logged in to GHCR successfully"
else
    echo "  ✗ Failed to login to GHCR"
    exit 1
fi
echo ""

# Step 3: Build Docker image
echo "Step 3: Building Docker image..."
echo "  Image: $FULL_IMAGE_NAME:latest"
echo ""

cd "$DOCKER_DIR"
docker build -t "$FULL_IMAGE_NAME:latest" .

echo ""
echo "  ✓ Docker image built successfully"
echo ""

# Step 4: Push to GHCR
echo "Step 4: Pushing to GHCR..."
echo ""

docker push "$FULL_IMAGE_NAME:latest"

if [ $? -eq 0 ]; then
    echo "  ✓ Image pushed successfully"
else
    echo "  ✗ Failed to push image"
    exit 1
fi
echo ""

# Step 5: Get image digest
echo "Step 5: Image information..."
echo ""

IMAGE_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' "$FULL_IMAGE_NAME:latest" 2>/dev/null || echo "N/A")
IMAGE_SIZE=$(docker image inspect "$FULL_IMAGE_NAME:latest" --format='{{.Size}}' 2>/dev/null | awk '{print $1/1024/1024 " MB"}' || echo "N/A")

echo "  Full name: $FULL_IMAGE_NAME:latest"
echo "  Digest: $IMAGE_DIGEST"
echo "  Size: $IMAGE_SIZE"
echo ""

echo "========================================="
echo "  Push Complete!"
echo "========================================="
echo ""
echo "Image URL: https://github.com/${GHCR_USERNAME}/${IMAGE_NAME}/pkgs/container/${IMAGE_NAME}"
echo ""
echo "Next steps:"
echo "1. Update docker-compose.yaml if needed"
echo "2. Build FPK package: fnpack build"
echo "3. Install on fnOS"
echo ""
