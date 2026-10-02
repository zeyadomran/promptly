import AppKit
import Foundation

let app = NSApplication.shared
let mode = CommandLine.arguments[1]
let directory = CommandLine.arguments[2]
let cooperative = CommandLine.arguments.count > 3 && CommandLine.arguments[3] == "cooperative"
try? String(ProcessInfo.processInfo.processIdentifier).write(
    toFile: directory + "/owner.pid", atomically: true, encoding: .utf8)
app.setActivationPolicy(.regular)
let window = NSWindow(contentRect: NSRect(x: 200, y: 200, width: 480, height: 160),
    styleMask: [.titled, .closable], backing: .buffered, defer: false)
window.title = "Promptly owned selection fixture"
var textView: SelectionView?
let text = SelectionView(frame: NSRect(x: 10, y: 10, width: 460, height: 140))
text.string = "  Promptly \u{96ea}\u{1f642}\r\n\"fixture\"\t\u{0000}end  "
window.contentView?.addSubview(text)
window.makeFirstResponder(text)
text.setSelectedRange(NSRange(location: 0, length: mode == "empty" ? 0 : text.string.utf16.count))
textView = text
func writeState(_ name: String) {
    let state: [String: Any] = ["fixturePid": ProcessInfo.processInfo.processIdentifier,
        "foregroundMatched": NSWorkspace.shared.frontmostApplication?.processIdentifier == ProcessInfo.processInfo.processIdentifier,
        "selectionLocation": textView?.selectedRange().location ?? 0,
        "selectionLength": textView?.selectedRange().length ?? 0,
        "pasteboardChangeCount": NSPasteboard.general.changeCount]
    if let data = try? JSONSerialization.data(withJSONObject: state) {
        try? data.write(to: URL(fileURLWithPath: directory).appendingPathComponent(name), options: .atomic)
    }
}
app.finishLaunching()
DispatchQueue.main.async {
    window.orderFront(nil)
    if !cooperative {
        window.makeKeyAndOrderFront(nil)
        if #available(macOS 14.0, *) { app.activate() }
    }
    writeState("initialized.json")
}
let readinessDeadline = ProcessInfo.processInfo.systemUptime + 5
var ready = false
// Owned file signals permit state reads/clean shutdown without input injection or AppleScript.
let timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
    observeOwnedForeground(in: directory)
    MainActor.assumeIsolated { yieldOwnedActivation(in: directory) }
    if FileManager.default.fileExists(atPath: directory + "/activate") {
        try? FileManager.default.removeItem(atPath: directory + "/activate")
        window.makeKeyAndOrderFront(nil)
        if #available(macOS 14.0, *) { app.activate() }
    }
    if !ready && (NSWorkspace.shared.frontmostApplication?.isEqual(NSRunningApplication.current) == true
        || ProcessInfo.processInfo.systemUptime >= readinessDeadline) {
        ready = true
        writeState("ready.json")
    }
    if FileManager.default.fileExists(atPath: directory + "/inspect") {
        try? FileManager.default.removeItem(atPath: directory + "/inspect")
        writeState("state.json")
    }
    if FileManager.default.fileExists(atPath: directory + "/stop") { app.terminate(nil) }
}
DispatchQueue.main.asyncAfter(deadline: .now() + 60) { app.terminate(nil) }
app.run()
