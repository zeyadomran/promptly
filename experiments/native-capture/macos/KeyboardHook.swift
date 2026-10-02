import CoreGraphics
import Foundation

var keyboardTap: CFMachPort?

func startKeyboardHook() -> String {
    if keyboardTap != nil { return "ok" }
    if !CGPreflightListenEventAccess() { return "permissionDenied" }
    let mask = (CGEventMask(1) << CGEventType.keyDown.rawValue) |
        (CGEventMask(1) << CGEventType.keyUp.rawValue) |
        (CGEventMask(1) << CGEventType.flagsChanged.rawValue)
    guard let tap = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap,
        options: .listenOnly, eventsOfInterest: mask, callback: { _, type, event, _ in
            if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
                emit(["v": 1, "type": "hookDisabled", "status": "hookUnavailable"])
                return Unmanaged.passUnretained(event)
            }
            let key = event.getIntegerValueField(.keyboardEventKeycode)
            let modifier: String
            let flag: CGEventFlags
            switch key {
            case 56, 60: modifier = "shift"; flag = .maskShift
            case 59, 62: modifier = "control"; flag = .maskControl
            case 58, 61: modifier = "alt"; flag = .maskAlternate
            case 55, 54: modifier = "meta"; flag = .maskCommand
            default: modifier = "other"; flag = []
            }
            let down = type == .flagsChanged ? event.flags.contains(flag) : type == .keyDown
            emit(["v": 1, "type": "key", "modifier": modifier, "down": down,
                  "repeat": event.getIntegerValueField(.keyboardEventAutorepeat) != 0,
                  "timestampMs": Double(event.timestamp) / 1000000])
            return Unmanaged.passUnretained(event)
        }, userInfo: nil) else { return "hookUnavailable" }
    keyboardTap = tap
    let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
    CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
    CGEvent.tapEnable(tap: tap, enable: true)
    return "ok"
}

func stopKeyboardHook() {
    if let tap = keyboardTap { CGEvent.tapEnable(tap: tap, enable: false); CFMachPortInvalidate(tap) }
    keyboardTap = nil
}
