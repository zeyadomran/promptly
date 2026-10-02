import AppKit
import CoreGraphics

guard CommandLine.arguments.count == 3,
      let expected = Int32(CommandLine.arguments[1]),
      NSWorkspace.shared.frontmostApplication?.processIdentifier == expected else {
    print("{\"status\":\"activationDenied\",\"ownedForeground\":false,\"keysInjected\":false}")
    exit(0)
}
guard CGPreflightPostEventAccess() else {
    print("{\"status\":\"inputDenied\",\"ownedForeground\":true,\"keysInjected\":false}")
    exit(0)
}
let key: CGKeyCode
switch CommandLine.arguments[2] {
case "open": key = 109
case "pin": key = 103
case "capture": key = 111
default: exit(3)
}
guard let down = CGEvent(keyboardEventSource: nil, virtualKey: key, keyDown: true),
      let up = CGEvent(keyboardEventSource: nil, virtualKey: key, keyDown: false) else { exit(4) }
down.flags = [.maskControl, .maskAlternate]
up.flags = [.maskControl, .maskAlternate]
down.post(tap: .cghidEventTap)
up.post(tap: .cghidEventTap)
print("{\"status\":\"sent\",\"ownedForeground\":true,\"keysInjected\":true}")
