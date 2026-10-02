#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
mkdir -p "$root/out"
xcrun swiftc -swift-version 6 -warnings-as-errors -O -framework ApplicationServices -framework Carbon "$root/EventQueue.swift" "$root/PhysicalModifiers.swift" "$root/KeyboardTap.swift" "$root/main.swift" -o "$root/out/promptly-keyboard"
