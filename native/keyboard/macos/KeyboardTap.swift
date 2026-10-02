import ApplicationServices
import Carbon
import CoreGraphics
import Foundation

final class KeyboardTap {
    private let output: EventQueue
    private let startTime = DispatchTime.now().uptimeNanoseconds
    private var port: CFMachPort?
    private var source: CFRunLoopSource?
    private var healthTimer: CFRunLoopTimer?
    private var previous = 0
    private var lastListening = false
    private var lastAccessible = false

    init(output: EventQueue) { self.output = output }

    private var time: Double {
        Double(DispatchTime.now().uptimeNanoseconds - startTime) / 1_000_000
    }

    func start() {
        let listening = CGPreflightListenEventAccess()
        let accessible = AXIsProcessTrusted()
        lastListening = listening
        lastAccessible = accessible
        previous = PhysicalModifiers.initial()
        let events = (CGEventMask(1) << CGEventType.keyDown.rawValue)
            | (CGEventMask(1) << CGEventType.keyUp.rawValue)
            | (CGEventMask(1) << CGEventType.flagsChanged.rawValue)
        if listening && !IsSecureEventInputEnabled() {
            port = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap,
                options: .listenOnly, eventsOfInterest: events, callback: { _, type, event, pointer in
                    guard let pointer else { return Unmanaged.passUnretained(event) }
                    let owner = Unmanaged<KeyboardTap>.fromOpaque(pointer).takeUnretainedValue()
                    owner.receive(type, event: event)
                    return Unmanaged.passUnretained(event)
                }, userInfo: Unmanaged.passUnretained(self).toOpaque())
        }
        let installed = port != nil
        output.offer("{\"kind\":\"ready\",\"installed\":\(installed),\"mask\":\(previous),\"timeMs\":\(time),\"accessibility\":\(accessible),\"inputMonitoring\":\(listening)}", time: time)
        if let port {
            source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, port, 0)
            CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
            CGEvent.tapEnable(tap: port, enable: true)
            var context = CFRunLoopTimerContext(version: 0,
                info: Unmanaged.passUnretained(self).toOpaque(), retain: nil, release: nil, copyDescription: nil)
            healthTimer = CFRunLoopTimerCreate(kCFAllocatorDefault, CFAbsoluteTimeGetCurrent() + 0.25,
                0.25, 0, 0, { _, pointer in
                    guard let pointer else { return }
                    Unmanaged<KeyboardTap>.fromOpaque(pointer).takeUnretainedValue().checkHealth()
                }, &context)
            CFRunLoopAddTimer(CFRunLoopGetMain(), healthTimer, .commonModes)
        }
    }

    private func receive(_ type: CGEventType, event: CGEvent) {
        guard port != nil else { return }
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput || IsSecureEventInputEnabled() {
            output.offer("{\"kind\":\"reset\",\"timeMs\":\(time)}", time: time)
            stop()
            return
        }
        output.offer(PhysicalModifiers.frame(event, type: type, previous: &previous, time: time), time: time)
    }

    func checkHealth() {
        guard let port else { return }
        let listening = CGPreflightListenEventAccess()
        let accessible = AXIsProcessTrusted()
        let installed = CGEvent.tapIsEnabled(tap: port) && listening && !IsSecureEventInputEnabled()
        if !installed || listening != lastListening || accessible != lastAccessible {
            output.offer("{\"kind\":\"health\",\"installed\":\(installed),\"timeMs\":\(time),\"accessibility\":\(accessible),\"inputMonitoring\":\(listening)}", time: time)
            lastListening = listening
            lastAccessible = accessible
        }
        if !installed { stop() }
    }

    func stop() {
        if let healthTimer { CFRunLoopTimerInvalidate(healthTimer) }
        healthTimer = nil
        if let port {
            CGEvent.tapEnable(tap: port, enable: false)
            CFMachPortInvalidate(port)
        }
        if let source { CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes) }
        source = nil
        port = nil
    }
}
