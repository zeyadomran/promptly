#!/bin/sh
set -eu
cd "$(dirname "$0")"
sh identity/build.sh
mkdir -p out/SelectionFixture.app/Contents/MacOS
swiftc -swift-version 5 -warnings-as-errors SelectionView.swift ForegroundObserver.swift main.swift \
  -framework AppKit -o out/SelectionFixture.app/Contents/MacOS/selection-fixture
cp Info.plist out/SelectionFixture.app/Contents/Info.plist
