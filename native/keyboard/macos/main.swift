import Foundation

let output = EventQueue()
let tap = KeyboardTap(output: output)
Thread.detachNewThread { output.write() }
Thread.detachNewThread {
    while readLine() != nil {}
    DispatchQueue.main.async {
        tap.stop()
        exit(0)
    }
}
tap.start()
withExtendedLifetime(tap) { CFRunLoopRun() }
