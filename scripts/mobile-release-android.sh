#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="${ROOT_DIR}/mobile-app/android"
RELEASE_TYPE="${1:-aab}"
SKIP_BUILD="${2:-}"

if [[ "${RELEASE_TYPE}" != "apk" && "${RELEASE_TYPE}" != "aab" ]]; then
  echo "Usage: bash scripts/mobile-release-android.sh [apk|aab] [--skip-build]"
  exit 1
fi

if [[ "${SKIP_BUILD}" != "" && "${SKIP_BUILD}" != "--skip-build" ]]; then
  echo "Usage: bash scripts/mobile-release-android.sh [apk|aab] [--skip-build]"
  exit 1
fi

if [[ ! -d "${ANDROID_DIR}" ]]; then
  echo "Android project not found at: ${ANDROID_DIR}"
  exit 1
fi

echo "Syncing Android project..."
cd "${ROOT_DIR}"
bash scripts/mobile-sync.sh android "${SKIP_BUILD}"

if [[ -f "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home/bin/java" ]]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
fi

echo "Building signed Android ${RELEASE_TYPE}..."
cd "${ANDROID_DIR}"

if [[ "${RELEASE_TYPE}" == "apk" ]]; then
  ./gradlew assembleRelease
  echo "Signed APK: ${ANDROID_DIR}/app/build/outputs/apk/release/app-release.apk"
else
  ./gradlew bundleRelease
  echo "Signed AAB: ${ANDROID_DIR}/app/build/outputs/bundle/release/app-release.aab"
fi
