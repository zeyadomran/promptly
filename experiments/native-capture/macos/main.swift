import AppKit
import ApplicationServices
import Foundation

let protocolFixtures = CommandLine.arguments.contains("--protocol-fixtures")
var nativeReads = 0

func respond(_ request: [String: Any]) -> [String: Any] {
    guard jsonInteger(request["v"]) == 1, let id = request["id"] as? String, id.count <= 128,
          let command = request["command"] as? String else { return ["v": 1, "id": "invalid", "status": "invalidRequest"] }
    var result: [String: Any]
    switch command {
    case "capabilities":
        result = ["status": "ok", "platform": "darwin", "selection": "AXSelectedText",
                  "clipboardFallback": false, "accessibility": AXIsProcessTrusted(),
                  "inputMonitoring": CGPreflightListenEventAccess(), "hook": "CGEventTap.listenOnly"]
    case "capture":
        guard let options = captureOptions(request) else { return ["v": 1, "id": id, "status": "invalidRequest"] }
        nativeReads += 1
        let start = ProcessInfo.processInfo.systemUptime
        result = readSelection(expectedPid: options.pid, includeText: options.includeText)
        result["elapsedMs"] = (ProcessInfo.processInfo.systemUptime - start) * 1000
    case "fixturePayload" where protocolFixtures: result = fixturePayload(request)
    case "fixtureStats" where protocolFixtures: result = ["status": "ok", "nativeReads": nativeReads]
    case "fixtureOptions" where protocolFixtures:
        guard let options = captureOptions(request) else { return ["v": 1, "id": id, "status": "invalidRequest"] }
        result = ["status": "ok", "expectedPid": options.pid, "includeText": options.includeText]
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

if CommandLine.arguments.count > 1 && CommandLine.arguments[1] == "--fixture" {
    runFixture(mode: CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : "selected")
    exit(0)
}

DispatchQueue.global().async {
    while let line = readLine() {
        guard line.utf8.count <= 4096, let data = line.data(using: .utf8),
              let request = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            emit(["v": 1, "id": "invalid", "status": "invalidRequest"])
            continue
        }
        DispatchQueue.main.sync {
            let response = respond(request)
            emit(response)
            if request["command"] as? String == "stop" && response["status"] as? String == "ok" { stopKeyboardHook(); exit(0) }
        }
    }
    DispatchQueue.main.async { stopKeyboardHook(); exit(0) }
}
CFRunLoopRun()
