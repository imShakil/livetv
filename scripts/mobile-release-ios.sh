#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="${ROOT_DIR}/mobile-app/ios/App"
BUILD_DIR="${ROOT_DIR}/mobile-artifacts/ios"
ARCHIVE_PATH="${BUILD_DIR}/App.xcarchive"
EXPORT_PATH="${BUILD_DIR}/export"
EXPORT_OPTIONS_PLIST="${IOS_DIR}/exportOptions.plist"
SKIP_BUILD="${1:-}"

if [[ "${SKIP_BUILD}" != "" && "${SKIP_BUILD}" != "--skip-build" ]]; then
  echo "Usage: bash scripts/mobile-release-ios.sh [--skip-build]"
  exit 1
fi

if [[ ! -d "${IOS_DIR}" ]]; then
  echo "iOS project not found at: ${IOS_DIR}"
  exit 1
fi

if [[ ! -f "${EXPORT_OPTIONS_PLIST}" ]]; then
  echo "Missing export options plist: ${EXPORT_OPTIONS_PLIST}"
  echo "Create it or set EXPORT_OPTIONS_PLIST env var in this script."
  exit 1
fi

echo "Syncing iOS project..."
cd "${ROOT_DIR}"
bash scripts/mobile-sync.sh ios "${SKIP_BUILD}"

echo "Archiving iOS app..."
cd "${IOS_DIR}"
mkdir -p "${BUILD_DIR}"
xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "${ARCHIVE_PATH}" \
  archive

echo "Exporting signed IPA..."
xcodebuild \
  -exportArchive \
  -archivePath "${ARCHIVE_PATH}" \
  -exportOptionsPlist "${EXPORT_OPTIONS_PLIST}" \
  -exportPath "${EXPORT_PATH}"

echo "Signed IPA exported to: ${EXPORT_PATH}"
