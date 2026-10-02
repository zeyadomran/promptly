#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p out
# Unsigned build only. Production signing/notarization belongs to the user.
swiftc -swift-version 5 -warnings-as-errors macos/Capture.swift macos/KeyboardHook.swift macos/Fixture.swift macos/main.swift \
  -framework AppKit -framework ApplicationServices -framework Carbon -o out/promptly-native
mkdir -p out/NativeFixture.app/Contents/MacOS
cp out/promptly-native out/NativeFixture.app/Contents/MacOS/promptly-native
cp macos/Fixture-Info.plist out/NativeFixture.app/Contents/Info.plist
