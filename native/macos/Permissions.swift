import ApplicationServices
import CoreGraphics

func permissions() -> [String: Any] {
    // Never prompt or attempt to modify TCC. P07 owns installing the passive event tap.
    ["status": "ok", "accessibility": AXIsProcessTrusted() ? "granted" : "denied",
     "inputMonitoring": CGPreflightListenEventAccess() ? "granted" : "denied",
     "inputMonitoringRequiredFor": "passiveKeyboardHook", "selectionRequires": "accessibility"]
}
