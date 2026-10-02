import CoreGraphics

struct PhysicalModifiers {
    // IOHIDSystem device-dependent flag masks, mapped into the cross-platform eight bits.
    static let keys: [CGKeyCode] = [56, 60, 59, 62, 58, 61, 55, 54]
    static let devices: [UInt64] = [0x2, 0x4, 0x1, 0x2000, 0x20, 0x40, 0x8, 0x10]

    static func initial() -> Int {
        keys.enumerated().reduce(0) { value, entry in
            CGEventSource.keyState(.combinedSessionState, key: entry.element)
                ? value | (1 << entry.offset) : value
        }
    }

    static func mask(_ flags: UInt64) -> Int? {
        let value = devices.enumerated().reduce(0) { result, entry in
            flags & entry.element != 0 ? result | (1 << entry.offset) : result
        }
        let aggregates: [UInt64] = [0x20000, 0x40000, 0x80000, 0x100000]
        for (index, aggregate) in aggregates.enumerated() {
            let physical = value & (3 << (2 * index)) != 0
            if physical != (flags & aggregate != 0) { return nil }
        }
        return value
    }

    static func frame(_ event: CGEvent, type: CGEventType, previous: inout Int, time: Double) -> String {
        guard type == .flagsChanged,
              keys.contains(CGKeyCode(event.getIntegerValueField(.keyboardEventKeycode))),
              let mask = mask(event.flags.rawValue) else {
            return "{\"kind\":\"cancel\",\"timeMs\":\(time)}"
        }
        let repeated = previous == mask
        previous = mask
        return "{\"kind\":\"modifiers\",\"mask\":\(mask),\"repeat\":\(repeated),\"timeMs\":\(time)}"
    }
}
