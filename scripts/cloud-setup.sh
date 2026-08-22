#!/usr/bin/env bash
set -euo pipefail

# Cloud Environment bootstrap script for gova repository
echo "=== Setting up gova cloud environment ==="

# Ensure npm 11 is available
npm install -g npm@11

# Install repository dependencies cleanly
npm ci

echo "=== gova cloud environment setup complete ==="
