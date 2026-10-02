import CoreGraphics
import Foundation

@main struct Fixture {
    static func main() {
        var previous = 0
        for (index, key) in PhysicalModifiers.keys.enumerated() {
            let aggregate: UInt64 = [0x20000, 0x40000, 0x80000, 0x100000][index / 2]
            guard let event = CGEvent(keyboardEventSource: nil, virtualKey: key, keyDown: true) else { exit(1) }
            event.flags = CGEventFlags(rawValue: aggregate | PhysicalModifiers.devices[index])
            print(PhysicalModifiers.frame(event, type: .flagsChanged, previous: &previous, time: 10))
            event.flags = []
            print(PhysicalModifiers.frame(event, type: .flagsChanged, previous: &previous, time: 20))
        }
        guard let left = CGEvent(keyboardEventSource: nil, virtualKey: 56, keyDown: true),
              let right = CGEvent(keyboardEventSource: nil, virtualKey: 60, keyDown: true) else { exit(1) }
        left.flags = CGEventFlags(rawValue: 0x20002)
        print(PhysicalModifiers.frame(left, type: .flagsChanged, previous: &previous, time: 30))
        right.flags = CGEventFlags(rawValue: 0x20006)
        print(PhysicalModifiers.frame(right, type: .flagsChanged, previous: &previous, time: 40))
        left.flags = CGEventFlags(rawValue: 0x20004)
        print(PhysicalModifiers.frame(left, type: .flagsChanged, previous: &previous, time: 50))
        right.flags = []
        print(PhysicalModifiers.frame(right, type: .flagsChanged, previous: &previous, time: 60))
        left.flags = CGEventFlags(rawValue: 0x20002)
        print(PhysicalModifiers.frame(left, type: .flagsChanged, previous: &previous, time: 70))
        print(PhysicalModifiers.frame(left, type: .flagsChanged, previous: &previous, time: 80))
        print(PhysicalModifiers.frame(left, type: .keyDown, previous: &previous, time: 90))
        left.flags = CGEventFlags(rawValue: 0x20000)
        print(PhysicalModifiers.frame(left, type: .flagsChanged, previous: &previous, time: 100))
    }
}
