import AppKit
import Foundation

// Owned test-only observer: publish only owned match and creation-guard availability.
func observeOwnedForeground(in directory: String) {
    let request = directory + "/foreground-request"
    guard FileManager.default.fileExists(atPath: request) else { return }
    let text = (try? String(contentsOfFile: request, encoding: .utf8)) ?? ""
    try? FileManager.default.removeItem(atPath: request)
    let pid = Int32(text) ?? 0
    let application = NSWorkspace.shared.frontmostApplication
    let matched = pid > 0 && application?.processIdentifier == pid
    // Never inspect launch metadata for an unrelated foreground process.
    let launchDateAvailable = matched && application?.launchDate != nil
    if let data = try? JSONSerialization.data(withJSONObject: [
        "matched": matched, "launchDateAvailable": launchDateAvailable
    ]) {
        try? data.write(to: URL(fileURLWithPath: directory + "/foreground.json"), options: .atomic)
    }
}
