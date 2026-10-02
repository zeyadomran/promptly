import AppKit
import ApplicationServices
import Carbon
import Foundation

func capture(_ request: [String: Any]) -> [String: Any] {
    guard let includeText = jsonBoolean(request["includeText"]), includeText else { return ["status": "invalidRequest"] }
    if let supplied = request["expectedPid"] {
        guard let pid = jsonInteger(supplied), pid > 0, pid <= Int64(Int32.max) else { return ["status": "invalidRequest"] }
    }
    let identity: SourceIdentity?
    if request["identity"] != nil {
        guard let token = requestToken(request) else { return ["status": "invalidRequest"] }
        identity = SourceIdentity.resolve(token)
    } else {
        // Direct protocol callers must still explicitly guard the expected foreground PID.
        guard let pid = jsonInteger(request["expectedPid"]),
              NSWorkspace.shared.frontmostApplication?.processIdentifier == pid else { return ["status": "foregroundChanged"] }
        identity = SourceIdentity.record()
    }
    guard let target = identity, target.valid(foreground: true),
          request["expectedPid"] == nil || jsonInteger(request["expectedPid"]) == Int64(target.pid) else {
        return ["status": "foregroundChanged"]
    }
    let start = ProcessInfo.processInfo.systemUptime
    var result = target.result("unsupported")
    if IsSecureEventInputEnabled() { return target.result("secureInput") }
    guard AXIsProcessTrusted() else { return target.result("permissionDenied") }
    let application = AXUIElementCreateApplication(target.pid)
    guard AXUIElementSetMessagingTimeout(application, 0.025) == .success else { return target.result("providerError") }
    var focusedValue: CFTypeRef?
    let error = AXUIElementCopyAttributeValue(application, kAXFocusedUIElementAttribute as CFString, &focusedValue)
    guard error == .success, let value = focusedValue, CFGetTypeID(value) == AXUIElementGetTypeID() else {
        return target.result(axFailure(error))
    }
    let focused = unsafeBitCast(value, to: AXUIElement.self)
    guard AXUIElementSetMessagingTimeout(focused, 0.025) == .success else { return target.result("providerError") }
    var focusedPid: pid_t = 0
    guard AXUIElementGetPid(focused, &focusedPid) == .success, focusedPid == target.pid else {
        return target.result("foregroundChanged")
    }
    var subrole: CFTypeRef?
    let subroleError = AXUIElementCopyAttributeValue(focused, kAXSubroleAttribute as CFString, &subrole)
    if subroleError != .success && subroleError != .attributeUnsupported && subroleError != .noValue {
        return target.result(axFailure(subroleError))
    }
    if subrole as? String == "AXSecureTextField" { return target.result("secureInput") }
    let (status, text) = selectedText(focused)
    // Revocation, secure-input changes and foreground/process changes discard data.
    guard target.valid(foreground: true) else { return target.result("foregroundChanged") }
    guard AXIsProcessTrusted() else { return target.result("permissionDenied") }
    guard !IsSecureEventInputEnabled() else { return target.result("secureInput") }
    result["status"] = status
    result["elapsedMs"] = (ProcessInfo.processInfo.systemUptime - start) * 1000
    if status == "ok", let text = text {
        result["text"] = text
        result["characterCount"] = text.utf16.count
    }
    return result
}
