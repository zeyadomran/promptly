#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p ../out
swiftc -swift-version 5 -warnings-as-errors ../../../../native/macos/ApplicationIdentity.swift \
  main.swift -o ../out/identity-policy-tests
../out/identity-policy-tests
