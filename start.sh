#!/usr/bin/env bash
set -e

echo "=========================================="
echo "⚡ Starting UtilityLens"
echo "=========================================="

if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    echo "🐳 Launching via Docker Compose..."
    docker compose up --build
else
    echo "⚠️ Docker or Docker Compose not found. Please install Docker or run services directly."
    exit 1
fi
