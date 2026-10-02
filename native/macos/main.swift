import AppKit
import ApplicationServices
import Foundation

let startup = ProcessInfo.processInfo.systemUptime
// Read-only framework warmup does not inspect another application's selection.
let warmupStarted = ProcessInfo.processInfo.systemUptime
let systemElement = AXUIElementCreateSystemWide()
let warmupReady = AXUIElementSetMessagingTimeout(systemElement, 0.025) == .success
let warmupMs = (ProcessInfo.processInfo.systemUptime - warmupStarted) * 1000

func respond(_ command: String, request: [String: Any]) -> [String: Any] {
    switch command {
    case "capabilities":
        return ["status": "ok", "platform": "darwin", "selection": "AXSelectedText",
                "warmupReady": warmupReady, "warmupMs": warmupMs,
                "startupMs": (ProcessInfo.processInfo.systemUptime - startup) * 1000]
    case "permissions": return permissions()
    case "foreground": return SourceIdentity.record()?.result("ok") ?? ["status": "foregroundChanged"]
    case "capture": return capture(request)
    case "activate":
        guard let token = requestToken(request) else { return ["status": "invalidRequest"] }
        return ["status": SourceIdentity.resolve(token)?.activate() ?? "foregroundChanged"]
    case "stop": return ["status": "ok"]
    default: return ["status": "invalidRequest"]
    }
}

// Main-run-loop requests keep NSWorkspace/NSRunningApplication's OS state current.
DispatchQueue.global().async {
    while let request = readRequest(FileHandle.standardInput) {
        DispatchQueue.main.sync {
            guard let (id, command) = validRequest(request) else {
                let id = request["id"] as? String ?? "invalid"
                emit(["status": "invalidRequest"], id: id.isEmpty || id.utf16.count > 128 ? "invalid" : id)
                return
            }
            emit(respond(command, request: request), id: id)
            if command == "stop" { exit(0) }
        }
    }
    DispatchQueue.main.async { exit(0) }
}
CFRunLoopRun()
