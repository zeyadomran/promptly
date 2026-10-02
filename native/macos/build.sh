#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p out
# Native host architecture. Installers need no compiler; signing stays user-owned.
swiftc -swift-version 5 -warnings-as-errors Protocol.swift ApplicationIdentity.swift SourceIdentity.swift Permissions.swift \
  SelectionText.swift SelectionReader.swift main.swift -framework AppKit \
  -framework ApplicationServices -framework Carbon -o out/promptly-macos
