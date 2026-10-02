import AppKit
import ApplicationServices
import Carbon

func readSelection(expectedPid: Int32, includeText: Bool) -> [String: Any] {
    let start = ProcessInfo.processInfo.systemUptime
    var result: [String: Any] = ["status": "unsupported"]
    guard let app = NSWorkspace.shared.frontmostApplication else { return ["status": "foregroundChanged"] }
    let pid = app.processIdentifier
    result["source"] = ["pid": pid, "name": app.localizedName ?? "Unknown", "id": app.bundleIdentifier as Any? ?? NSNull()]
    if expectedPid != 0 && expectedPid != pid { return ["status": "foregroundChanged"] }
    if IsSecureEventInputEnabled() { result["status"] = "secureInput"; return result }
    if !AXIsProcessTrusted() { return ["status": "permissionDenied"] }
    let element = AXUIElementCreateApplication(pid)
    AXUIElementSetMessagingTimeout(element, 0.12)
    var focusedValue: CFTypeRef?
    let focusedError = AXUIElementCopyAttributeValue(element, kAXFocusedUIElementAttribute as CFString, &focusedValue)
    guard focusedError == .success, let value = focusedValue,
          CFGetTypeID(value) == AXUIElementGetTypeID() else {
        return ["status": focusedError == .apiDisabled ? "permissionDenied" : "unsupported"]
    }
    let focused = unsafeBitCast(value, to: AXUIElement.self)
    AXUIElementSetMessagingTimeout(focused, 0.12)
    var subrole: CFTypeRef?
    AXUIElementCopyAttributeValue(focused, kAXSubroleAttribute as CFString, &subrole)
    if subrole as? String == "AXSecureTextField" { result["status"] = "secureInput"; return result }
    var selected: CFTypeRef?
    let error = AXUIElementCopyAttributeValue(focused, kAXSelectedTextAttribute as CFString, &selected)
    if error == .success, let text = selected as? String {
        if text.utf16.count > 1048576 { return ["status": "selectionTooLarge"] }
        result["status"] = text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "empty" : "ok"
        result["characterCount"] = text.utf16.count
        if includeText && result["status"] as? String == "ok" { result["text"] = text }
    } else {
        result["status"] = error == .apiDisabled ? "permissionDenied" :
            error == .cannotComplete ? "providerError" : "unsupported"
    }
    if NSWorkspace.shared.frontmostApplication?.processIdentifier != pid {
        result.removeValue(forKey: "text")
        result["status"] = "foregroundChanged"
    }
    result["elapsedMs"] = (ProcessInfo.processInfo.systemUptime - start) * 1000
    return result
}

func clipboardMetadata() -> [String: Any] {
    let board = NSPasteboard.general
    let before = board.changeCount
    // Enumerate advertised types only: data(forType:) could invoke lazy providers.
    let formats = (board.types ?? []).map { $0.rawValue }
    return ["status": "ok", "formats": formats, "counterBefore": before,
            "counterAfter": board.changeCount, "faithfulSnapshot": false]
}
