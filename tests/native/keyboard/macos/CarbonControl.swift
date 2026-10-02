import AppKit
import Carbon
import CoreGraphics

@MainActor @main struct CarbonControl {
    static func main() {
        let environment = ProcessInfo.processInfo.environment
        guard environment["CI"] == "true",
              environment["GITHUB_ACTIONS"] == "true",
              environment["RUNNER_ENVIRONMENT"] == "github-hosted",
              environment["RUNNER_OS"] == "macOS",
              CommandLine.arguments.count == 3,
              let chord = ProbeChord(rawValue: CommandLine.arguments[2]) else { exit(2) }
        let directory = CommandLine.arguments[1]
        try? String(ProcessInfo.processInfo.processIdentifier).write(
            toFile: directory + "/owner.pid", atomically: true, encoding: .utf8)
        let application = NSApplication.shared
        application.setActivationPolicy(.regular)
        let window = NSWindow(contentRect: NSRect(x: 180, y: 180, width: 320, height: 180),
            styleMask: [.titled, .closable], backing: .buffered, defer: false)
        window.title = "Promptly owned Carbon control"
        let probe = CarbonCounters(chord: chord)
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
    private let chord: ProbeChord
    private var handler: EventHandlerRef?
    private var hotKey: EventHotKeyRef?
    private var port: CFMachPort?
    private var source: CFRunLoopSource?
    private var observations = CarbonObservations()
    private var localMonitor: Any?
    private var localMonitorInstalled = false
    private var localMonitorRemoved = false
    private var sessionDown = 0
    private var sessionUp = 0
    private var tapDisabled = 0
    private var handlerStatus: OSStatus = -1
    private var registrationStatus: OSStatus = -1
    private var listening = false
    private var tapInstalled = false
    private let started = ProcessInfo.processInfo.systemUptime

    init(chord: ProbeChord) { self.chord = chord }

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
            guard let context else { return OSStatus(eventNotHandledErr) }
            let owner = Unmanaged<CarbonCounters>.fromOpaque(context).takeUnretainedValue()
            return MainActor.assumeIsolated { owner.receiveCarbon(event) }
        }, 1, &type, pointer, &handler)
        registrationStatus = RegisterEventHotKey(UInt32(chord.keyCode), UInt32(controlKey) | UInt32(optionKey),
            EventHotKeyID(signature: 0x50724F62, id: 1), GetApplicationEventTarget(), 0, &hotKey)
        localMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp]) { [weak self] event in
            MainActor.assumeIsolated {
                if let self { self.receiveLocal(event) }
            }
            return event
        }
        localMonitorInstalled = localMonitor != nil
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

    private func receiveCarbon(_ event: EventRef?) -> OSStatus {
        observations.enterCarbon()
        var identifier = EventHotKeyID()
        let status = event.map { GetEventParameter($0, EventParamName(kEventParamDirectObject),
            EventParamType(typeEventHotKeyID), nil, numericCast(MemoryLayout<EventHotKeyID>.size), nil, &identifier)
        } ?? OSStatus(eventNotHandledErr)
        guard observations.decodeCarbon(succeeded: status == noErr,
            signature: identifier.signature, id: identifier.id) else {
            return status == noErr ? OSStatus(eventNotHandledErr) : status
        }
        return noErr
    }

    private func receiveLocal(_ event: NSEvent) {
        // Gate the fixed chord before inspecting any characters. Never retain arbitrary text/flags.
        guard event.keyCode == chord.keyCode,
              event.modifierFlags.intersection([.control, .option]) == [.control, .option],
              event.modifierFlags.intersection([.command, .shift]).isEmpty else { return }
        observations.recordLocal(down: event.type == .keyDown,
            f11Character: event.charactersIgnoringModifiers?.utf16.elementsEqual([UInt16(NSF11FunctionKey)]) == true,
            function: event.modifierFlags.contains(.function),
            numericPad: event.modifierFlags.contains(.numericPad),
            kCharacter: chord == .letterK && event.charactersIgnoringModifiers?.utf16.elementsEqual([UInt16(0x006b)]) == true)
    }

    private func receiveSession(_ type: CGEventType, _ event: CGEvent) {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            tapDisabled = min(1024, tapDisabled + 1)
            return
        }
        // Discard all unrelated events immediately; retain only this fixed chord's counts.
        guard event.getIntegerValueField(.keyboardEventKeycode) == Int64(chord.keyCode),
              event.flags.intersection(.maskControl.union(.maskAlternate)) == [.maskControl, .maskAlternate],
              event.flags.intersection([.maskCommand, .maskShift]).isEmpty else { return }
        if type == .keyDown { sessionDown = min(1024, sessionDown + 1) }
        if type == .keyUp { sessionUp = min(1024, sessionUp + 1) }
    }

    func stop() {
        if let localMonitor {
            NSEvent.removeMonitor(localMonitor)
            localMonitorRemoved = true
        }
        localMonitor = nil
        if let hotKey { UnregisterEventHotKey(hotKey) }
        if let handler { RemoveEventHandler(handler) }
        if let port { CGEvent.tapEnable(tap: port, enable: false); CFMachPortInvalidate(port) }
        if let source { CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes) }
        hotKey = nil; handler = nil; port = nil; source = nil
    }

    func write(_ phase: String, directory: String) {
        let receipt: [String: Any] = ["phase": phase, "chord": chord.rawValue,
            "pid": ProcessInfo.processInfo.processIdentifier,
            "foregroundMatched": NSWorkspace.shared.frontmostApplication?.processIdentifier == ProcessInfo.processInfo.processIdentifier,
            "handlerStatus": handlerStatus, "registrationStatus": registrationStatus,
            "listening": listening, "tapInstalled": tapInstalled,
            "carbonPressed": observations.carbonPressed, "handlerEntered": observations.handlerEntered,
            "parameterFailed": observations.parameterFailed, "idMismatch": observations.idMismatch,
            "localDown": observations.localDown, "localUp": observations.localUp,
            "localF11Character": observations.localF11Character, "localKCharacter": observations.localKCharacter,
            "localFunction": observations.localFunction,
            "localNumericPad": observations.localNumericPad, "localMonitorInstalled": localMonitorInstalled,
            "localMonitorRemoved": localMonitorRemoved, "sessionDown": sessionDown, "sessionUp": sessionUp,
            "tapDisabled": tapDisabled, "elapsedMs": (ProcessInfo.processInfo.systemUptime - started) * 1000]
        if let data = try? JSONSerialization.data(withJSONObject: receipt) {
            try? data.write(to: URL(fileURLWithPath: directory + "/" + phase + ".json"), options: .atomic)
        }
    }
}
