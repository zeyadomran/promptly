import Carbon
import CoreGraphics
import Foundation

@MainActor @main struct SessionSidecar {
    static func main() {
        let environment = ProcessInfo.processInfo.environment
        guard environment["CI"] == "true", environment["GITHUB_ACTIONS"] == "true",
              environment["RUNNER_ENVIRONMENT"] == "github-hosted", environment["RUNNER_OS"] == "macOS",
              CommandLine.arguments.count == 3,
              let chord = ProbeChord(rawValue: CommandLine.arguments[2]) else { exit(2) }
        let directory = CommandLine.arguments[1]
        let probe = SessionCounters(chord: chord)
        probe.start()
        probe.write("ready", directory: directory)
        let timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
            MainActor.assumeIsolated {
                if FileManager.default.fileExists(atPath: directory + "/inspect") {
                    try? FileManager.default.removeItem(atPath: directory + "/inspect")
                    probe.write("inspect", directory: directory)
                }
                if FileManager.default.fileExists(atPath: directory + "/stop") {
                    probe.write("final", directory: directory)
                    probe.stop()
                    CFRunLoopStop(CFRunLoopGetMain())
                }
            }
        }
        // A separate diagnostic lifetime, never a product deadline.
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
            probe.write("final", directory: directory)
            probe.stop()
            CFRunLoopStop(CFRunLoopGetMain())
        }
        CFRunLoopRun()
        timer.invalidate()
        probe.stop()
    }
}

@MainActor final class SessionCounters {
    private let chord: ProbeChord
    private var port: CFMachPort?
    private var source: CFRunLoopSource?
    private var down = 0
    private var up = 0
    private var disabled = 0
    private let started = ProcessInfo.processInfo.systemUptime

    init(chord: ProbeChord) { self.chord = chord }

    func start() {
        guard CGPreflightListenEventAccess(), !IsSecureEventInputEnabled() else { return }
        let events = (CGEventMask(1) << CGEventType.keyDown.rawValue)
            | (CGEventMask(1) << CGEventType.keyUp.rawValue)
        port = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap,
            options: .listenOnly, eventsOfInterest: events, callback: { _, type, event, context in
                if let context {
                    let owner = Unmanaged<SessionCounters>.fromOpaque(context).takeUnretainedValue()
                    MainActor.assumeIsolated { owner.receive(type, event) }
                }
                return Unmanaged.passUnretained(event)
            }, userInfo: Unmanaged.passUnretained(self).toOpaque())
        if let port {
            source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, port, 0)
            CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
            CGEvent.tapEnable(tap: port, enable: true)
        }
    }

    private func receive(_ type: CGEventType, _ event: CGEvent) {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            disabled = min(1024, disabled + 1)
            return
        }
        // Never store/log unrelated keys, text, windows, identities or raw event flags.
        guard event.getIntegerValueField(.keyboardEventKeycode) == Int64(chord.keyCode),
              event.flags.intersection(.maskControl.union(.maskAlternate)) == [.maskControl, .maskAlternate],
              event.flags.intersection([.maskCommand, .maskShift]).isEmpty else { return }
        if type == .keyDown { down = min(1024, down + 1) }
        if type == .keyUp { up = min(1024, up + 1) }
    }

    func write(_ phase: String, directory: String) {
        let receipt: [String: Any] = ["phase": phase, "chord": chord.rawValue,
            "pid": ProcessInfo.processInfo.processIdentifier,
            "listening": CGPreflightListenEventAccess(), "tapInstalled": port != nil && source != nil,
            "enabled": port.map { CGEvent.tapIsEnabled(tap: $0) } ?? false,
            "secureInput": IsSecureEventInputEnabled(), "down": down, "up": up, "disabled": disabled,
            "elapsedMs": (ProcessInfo.processInfo.systemUptime - started) * 1000]
        if let data = try? JSONSerialization.data(withJSONObject: receipt) {
            try? data.write(to: URL(fileURLWithPath: directory + "/" + phase + ".json"), options: .atomic)
        }
    }

    func stop() {
        if let port { CGEvent.tapEnable(tap: port, enable: false); CFMachPortInvalidate(port) }
        if let source { CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes) }
        source = nil; port = nil
    }
}
