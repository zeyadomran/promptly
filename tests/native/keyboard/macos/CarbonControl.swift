import AppKit
import Carbon
import CoreGraphics

@MainActor @main struct CarbonControl {
    static func main() {
        guard ProcessInfo.processInfo.environment["CI"] == "true",
              CommandLine.arguments.count == 2 else { exit(2) }
        let directory = CommandLine.arguments[1]
        try? String(ProcessInfo.processInfo.processIdentifier).write(
            toFile: directory + "/owner.pid", atomically: true, encoding: .utf8)
        let application = NSApplication.shared
        application.setActivationPolicy(.regular)
        let window = NSWindow(contentRect: NSRect(x: 180, y: 180, width: 320, height: 180),
            styleMask: [.titled, .closable], backing: .buffered, defer: false)
        window.title = "Promptly owned Carbon control"
        let probe = CarbonCounters()
        probe.start()
        application.finishLaunching()
        DispatchQueue.main.async {
            window.makeKeyAndOrderFront(nil)
            if #available(macOS 14.0, *) { application.activate() }
        }
        probe.awaitForeground(directory: directory, deadline: ProcessInfo.processInfo.systemUptime + 2)
        // Independent diagnostic observation window; no product timeout changes.
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
            probe.stop()
            probe.write("final", directory: directory)
            application.terminate(nil)
        }
        application.run()
    }
}

@MainActor final class CarbonCounters {
    private var handler: EventHandlerRef?
    private var hotKey: EventHotKeyRef?
    private var port: CFMachPort?
    private var source: CFRunLoopSource?
    private var carbonPressed = 0
    private var sessionDown = 0
    private var sessionUp = 0
    private var tapDisabled = 0
    private var handlerStatus: OSStatus = -1
    private var registrationStatus: OSStatus = -1
    private var listening = false
    private var tapInstalled = false
    private let started = ProcessInfo.processInfo.systemUptime

    func awaitForeground(directory: String, deadline: TimeInterval) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            if NSWorkspace.shared.frontmostApplication?.processIdentifier == ProcessInfo.processInfo.processIdentifier
                || ProcessInfo.processInfo.systemUptime >= deadline {
                self.write("ready", directory: directory)
            } else {
                self.awaitForeground(directory: directory, deadline: deadline)
            }
        }
    }

    func start() {
        let pointer = Unmanaged.passUnretained(self).toOpaque()
        var type = EventTypeSpec(eventClass: OSType(kEventClassKeyboard),
            eventKind: UInt32(kEventHotKeyPressed))
        handlerStatus = InstallEventHandler(GetApplicationEventTarget(), { _, event, context in
            guard let context, let event else { return OSStatus(eventNotHandledErr) }
            let owner = Unmanaged<CarbonCounters>.fromOpaque(context).takeUnretainedValue()
            return MainActor.assumeIsolated { owner.receiveCarbon(event) }
        }, 1, &type, pointer, &handler)
        registrationStatus = RegisterEventHotKey(103, UInt32(controlKey) | UInt32(optionKey),
            EventHotKeyID(signature: 0x50724F62, id: 1), GetApplicationEventTarget(), 0, &hotKey)
        listening = CGPreflightListenEventAccess()
        if listening {
            let mask = (CGEventMask(1) << CGEventType.keyDown.rawValue)
                | (CGEventMask(1) << CGEventType.keyUp.rawValue)
            port = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap,
                options: .listenOnly, eventsOfInterest: mask, callback: { _, type, event, context in
                    if let context {
                        let owner = Unmanaged<CarbonCounters>.fromOpaque(context).takeUnretainedValue()
                        MainActor.assumeIsolated { owner.receiveSession(type, event) }
                    }
                    return Unmanaged.passUnretained(event)
                }, userInfo: pointer)
        }
        tapInstalled = port != nil
        if let port {
            source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, port, 0)
            CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
            CGEvent.tapEnable(tap: port, enable: true)
        }
    }

    private func receiveCarbon(_ event: EventRef) -> OSStatus {
        var identifier = EventHotKeyID()
        let status = GetEventParameter(event, EventParamName(kEventParamDirectObject),
            EventParamType(typeEventHotKeyID), nil, ByteCount(MemoryLayout<EventHotKeyID>.size), nil, &identifier)
        guard status == noErr else { return status }
        guard identifier.signature == 0x50724F62, identifier.id == 1 else { return OSStatus(eventNotHandledErr) }
        carbonPressed = min(1024, carbonPressed + 1)
        return noErr
    }

    private func receiveSession(_ type: CGEventType, _ event: CGEvent) {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            tapDisabled = min(1024, tapDisabled + 1)
            return
        }
        // Discard all unrelated events immediately; retain only this fixed chord's counts.
        guard event.getIntegerValueField(.keyboardEventKeycode) == 103,
              event.flags.intersection(.maskControl.union(.maskAlternate)) == [.maskControl, .maskAlternate],
              event.flags.intersection([.maskCommand, .maskShift]).isEmpty else { return }
        if type == .keyDown { sessionDown = min(1024, sessionDown + 1) }
        if type == .keyUp { sessionUp = min(1024, sessionUp + 1) }
    }

    func stop() {
        if let hotKey { UnregisterEventHotKey(hotKey) }
        if let handler { RemoveEventHandler(handler) }
        if let port { CGEvent.tapEnable(tap: port, enable: false); CFMachPortInvalidate(port) }
        if let source { CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes) }
        hotKey = nil; handler = nil; port = nil; source = nil
    }

    func write(_ phase: String, directory: String) {
        let receipt: [String: Any] = ["phase": phase,
            "pid": ProcessInfo.processInfo.processIdentifier,
            "foregroundMatched": NSWorkspace.shared.frontmostApplication?.processIdentifier == ProcessInfo.processInfo.processIdentifier,
            "handlerStatus": handlerStatus, "registrationStatus": registrationStatus,
            "listening": listening, "tapInstalled": tapInstalled,
            "carbonPressed": carbonPressed, "sessionDown": sessionDown, "sessionUp": sessionUp,
            "tapDisabled": tapDisabled, "elapsedMs": (ProcessInfo.processInfo.systemUptime - started) * 1000]
        if let data = try? JSONSerialization.data(withJSONObject: receipt) {
            try? data.write(to: URL(fileURLWithPath: directory + "/" + phase + ".json"), options: .atomic)
        }
    }
}
