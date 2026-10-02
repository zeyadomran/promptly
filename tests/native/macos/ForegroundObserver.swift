import AppKit
import Foundation

// Owned test-only observer: compare fresh OS foreground PID, publish no app metadata.
func observeOwnedForeground(in directory: String) {
    let request = directory + "/foreground-request"
    guard FileManager.default.fileExists(atPath: request) else { return }
    let text = (try? String(contentsOfFile: request, encoding: .utf8)) ?? ""
    try? FileManager.default.removeItem(atPath: request)
    let pid = Int32(text) ?? 0
    let matched = pid > 0 && NSWorkspace.shared.frontmostApplication?.processIdentifier == pid
    try? Data((matched ? "true" : "false").utf8).write(
        to: URL(fileURLWithPath: directory + "/foreground.json"), options: .atomic)
}
