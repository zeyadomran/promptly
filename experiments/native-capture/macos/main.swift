import AppKit
import ApplicationServices
import Foundation

let outputLock = NSLock()
func emit(_ response: [String: Any]) {
    outputLock.lock()
    defer { outputLock.unlock() }
    guard JSONSerialization.isValidJSONObject(response),
          let data = try? JSONSerialization.data(withJSONObject: response, options: [.sortedKeys]),
          let line = String(data: data, encoding: .utf8) else { return }
    print(line)
    fflush(stdout)
}

func respond(_ request: [String: Any]) -> [String: Any] {
    guard request["v"] as? Int == 1, let id = request["id"] as? String, id.count <= 128,
          let command = request["command"] as? String else { return ["v": 1, "id": "invalid", "status": "invalidRequest"] }
    var result: [String: Any]
    switch command {
    case "capabilities":
        result = ["status": "ok", "platform": "darwin", "selection": "AXSelectedText",
                  "clipboardFallback": false, "accessibility": AXIsProcessTrusted(),
                  "inputMonitoring": CGPreflightListenEventAccess(), "hook": "CGEventTap.listenOnly"]
    case "capture":
        let start = ProcessInfo.processInfo.systemUptime
        result = readSelection(expectedPid: (request["expectedPid"] as? NSNumber)?.int32Value ?? 0,
                               includeText: request["includeText"] as? Bool ?? false)
        result["elapsedMs"] = (ProcessInfo.processInfo.systemUptime - start) * 1000
    case "clipboardMetadata": result = clipboardMetadata()
    case "fallback":
        result = ["status": "unsupported", "reason": "faithful-all-format-snapshot-unproven",
                  "clipboardMutated": false, "keysInjected": false]
    case "hookStart": result = ["status": startKeyboardHook()]
    case "probeAltSpace":
        // Electron must perform a real globalShortcut registration for the chosen binding.
        result = ["status": "unsupported", "reason": "requires-electron-registration-probe"]
    case "stop": result = ["status": "ok"]
    default: result = ["status": "invalidRequest"]
    }
    result["v"] = 1
    result["id"] = id
    return result
}

DispatchQueue.global().async {
    while let line = readLine() {
        guard line.utf8.count <= 4096, let data = line.data(using: .utf8),
              let request = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            emit(["v": 1, "id": "invalid", "status": "invalidRequest"])
            continue
        }
        DispatchQueue.main.sync {
            emit(respond(request))
            if request["command"] as? String == "stop" { stopKeyboardHook(); exit(0) }
        }
    }
    DispatchQueue.main.async { stopKeyboardHook(); exit(0) }
}
CFRunLoopRun()
