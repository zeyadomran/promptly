import Foundation

/// Synchronization is confined to a 64-record queue; stdout never holds its lock.
final class EventQueue: @unchecked Sendable {
    private let condition = NSCondition()
    private var pending: [String] = []

    func offer(_ frame: String, time: Double) {
        condition.lock()
        if pending.count >= 64 {
            pending = ["{\"kind\":\"reset\",\"timeMs\":\(time)}"]
        } else {
            pending.append(frame)
        }
        condition.signal()
        condition.unlock()
    }

    func write() {
        while true {
            condition.lock()
            while pending.isEmpty { condition.wait() }
            let frame = pending.removeFirst()
            condition.unlock()
            do {
                try FileHandle.standardOutput.write(contentsOf: Data((frame + "\n").utf8))
            } catch {
                exit(0)
            }
        }
    }
}
