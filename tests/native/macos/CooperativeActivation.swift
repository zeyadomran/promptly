import AppKit
import Foundation

// The current foreground owned fixture may yield only to a live instance of this fixture.
@MainActor func yieldOwnedActivation(in directory: String) {
    let request = directory + "/yield-request"
    guard FileManager.default.fileExists(atPath: request) else { return }
    let text = (try? String(contentsOfFile: request, encoding: .utf8)) ?? ""
    try? FileManager.default.removeItem(atPath: request)
    var yielded = false
    if #available(macOS 14.0, *), let pid = Int32(text), pid > 0,
       NSWorkspace.shared.frontmostApplication?.isEqual(NSRunningApplication.current) == true,
       let target = NSRunningApplication(processIdentifier: pid), !target.isTerminated,
       target.processIdentifier == pid,
       let executable = Bundle.main.executableURL, let identifier = Bundle.main.bundleIdentifier,
       target.executableURL?.resolvingSymlinksInPath() == executable.resolvingSymlinksInPath(),
       target.bundleIdentifier == identifier {
        NSApplication.shared.yieldActivation(to: target)
        yielded = true
    }
    try? (yielded ? "true" : "false").write(toFile: directory + "/yield.json",
        atomically: true, encoding: .utf8)
}
