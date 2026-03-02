#!/usr/bin/env bash
set -euo pipefail

PLATFORM="${1:-all}"
SKIP_BUILD="${2:-}"

if [[ "${PLATFORM}" != "all" && "${PLATFORM}" != "android" && "${PLATFORM}" != "ios" ]]; then
  echo "Usage: bash scripts/mobile-sync.sh [all|android|ios] [--skip-build]"
  exit 1
fi

if [[ "${SKIP_BUILD}" != "" && "${SKIP_BUILD}" != "--skip-build" ]]; then
  echo "Usage: bash scripts/mobile-sync.sh [all|android|ios] [--skip-build]"
  exit 1
fi

if [[ "${SKIP_BUILD}" != "--skip-build" ]]; then
  echo "Building web assets..."
  npm run build
fi

if [[ "${PLATFORM}" == "all" || "${PLATFORM}" == "android" ]]; then
  echo "Syncing Android..."
  npx cap sync android
fi

if [[ "${PLATFORM}" == "all" || "${PLATFORM}" == "ios" ]]; then
  echo "Syncing iOS..."
  IOS_BUILD_DIR="mobile-app/ios/App/build"
  if [[ -d "${IOS_BUILD_DIR}" ]]; then
    # Capacitor runs xcodebuild clean during iOS update; mark local build dir as deletable.
    xattr -w com.apple.xcode.CreatedByBuildSystem true "${IOS_BUILD_DIR}" || true
  fi
  env -u GEM_HOME -u GEM_PATH -u BUNDLE_GEMFILE -u BUNDLE_PATH -u RUBYOPT npx cap sync ios
fi

echo "Mobile sync complete for platform: ${PLATFORM}"
