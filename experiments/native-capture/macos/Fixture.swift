import AppKit
import Foundation

func runFixture(mode: String) {
    let app = NSApplication.shared
    app.setActivationPolicy(.regular)
    let window = NSWindow(contentRect: NSRect(x: 200, y: 200, width: 420, height: 160),
                          styleMask: [.titled, .closable], backing: .buffered, defer: false)
    window.title = "Promptly controlled native fixture"
    if mode == "password" {
        let field = NSSecureTextField(frame: NSRect(x: 20, y: 70, width: 300, height: 30))
        field.stringValue = "fixture"
        window.contentView?.addSubview(field)
        window.makeFirstResponder(field)
    } else {
        let text = NSTextView(frame: NSRect(x: 10, y: 10, width: 400, height: 140))
        text.string = "Promptly fixture selection"
        window.contentView?.addSubview(text)
        window.makeFirstResponder(text)
        text.setSelectedRange(NSRange(location: 0, length: mode == "empty" ? 0 : text.string.utf16.count))
    }
    app.finishLaunching()
    DispatchQueue.main.async {
        window.makeKeyAndOrderFront(nil)
        if #available(macOS 14.0, *) { app.activate() }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
        let matched = NSWorkspace.shared.frontmostApplication?.processIdentifier == ProcessInfo.processInfo.processIdentifier
        print("{\"fixturePid\":\(ProcessInfo.processInfo.processIdentifier),\"foregroundMatched\":\(matched)}")
        fflush(stdout)
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 30) { app.terminate(nil) }
    app.run()
}
