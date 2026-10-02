import AppKit
import CoreGraphics

@MainActor @main struct ShortcutDriver {
    static func main() {
        guard CommandLine.arguments.count == 3,
              let expected = Int32(CommandLine.arguments[1]) else { exit(1) }
        let key: CGKeyCode
        switch CommandLine.arguments[2] {
        case "open": key = 109
        case "pin": key = 103
        case "capture": key = 111
        default: exit(3)
        }
        let driver = OwnedSequence(expected: expected)
        let status = driver.deliver(key)
        print("{\"status\":\"\(status)\",\"ownedForeground\":\(driver.ownedAtStart),\"keysInjected\":\(driver.injected)}")
    }
}

/// Fixed fixture keys only; observe modifier state, and release owned downs on every outcome.
@MainActor final class OwnedSequence {
    private let expected: Int32
    private var held: [CGKeyCode] = []
    private var downs: [CGKeyCode: CGEvent] = [:]
    private var ups: [CGKeyCode: CGEvent] = [:]
    private(set) var injected = false
    private(set) var ownedAtStart = false

    init(expected: Int32) { self.expected = expected }
    private var owned: Bool { NSWorkspace.shared.frontmostApplication?.processIdentifier == expected }
    private var flags: CGEventFlags {
        var value: CGEventFlags = []
        if held.contains(59) { value.insert(.maskControl) }
        if held.contains(58) { value.insert(.maskAlternate) }
        return value
    }

    func deliver(_ key: CGKeyCode) -> String {
        ownedAtStart = owned
        guard ownedAtStart else { return "activationDenied" }
        guard CGPreflightPostEventAccess(),
              [59, 58, key].allSatisfy({ !CGEventSource.keyState(.combinedSessionState, key: $0) }) else { return "inputDenied" }
        // Allocate every matching release before posting any down.
        for code: CGKeyCode in [59, 58, key] {
            guard let down = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: true),
                  let up = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: false) else { return "inputDenied" }
            downs[code] = down
            ups[code] = up
        }
        defer { for pressed in held.reversed() { release(pressed) } }
        for modifier: CGKeyCode in [59, 58] {
            guard press(modifier) else { return owned ? "inputDenied" : "activationDenied" }
            guard observeDown(modifier) else { return owned ? "inputDenied" : "activationDenied" }
        }
        guard press(key) else { return owned ? "inputDenied" : "activationDenied" }
        guard observeDown(key) else { return owned ? "inputDenied" : "activationDenied" }
        return "sent"
    }

    private func press(_ key: CGKeyCode) -> Bool {
        guard owned, let event = downs[key] else { return false }
        guard owned else { return false }
        held.append(key)
        if key == 59 || key == 58 { event.type = .flagsChanged }
        event.flags = flags
        event.post(tap: .cghidEventTap)
        injected = true
        return true
    }

    private func observeDown(_ key: CGKeyCode) -> Bool {
        let deadline = ProcessInfo.processInfo.systemUptime + 0.25
        while owned && ProcessInfo.processInfo.systemUptime < deadline {
            if CGEventSource.keyState(.combinedSessionState, key: key) { return true }
            RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.005))
        }
        return false
    }

    private func release(_ key: CGKeyCode) {
        held.removeAll { $0 == key }
        guard let event = ups[key] else { return }
        if key == 59 || key == 58 { event.type = .flagsChanged }
        event.flags = flags
        event.post(tap: .cghidEventTap)
    }
}
