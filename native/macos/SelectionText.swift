import ApplicationServices
import Foundation

func axFailure(_ error: AXError) -> String {
    switch error {
    case .apiDisabled: return "permissionDenied"
    case .attributeUnsupported, .parameterizedAttributeUnsupported, .noValue, .notImplemented:
        return "unsupported"
    default: return "providerError"
    }
}

// Providers with multiple ranges must supply every range exactly or fail explicitly.
func selectedText(_ element: AXUIElement) -> (String, String?) {
    var rangesValue: CFTypeRef?
    let rangesError = AXUIElementCopyAttributeValue(element, kAXSelectedTextRangesAttribute as CFString, &rangesValue)
    if rangesError == .apiDisabled || rangesError == .cannotComplete { return (axFailure(rangesError), nil) }
    if rangesError == .success, let ranges = rangesValue as? [AXValue], ranges.count > 1 {
        guard ranges.count <= 64 else { return ("unsupported", nil) }
        var text = ""
        var units = 0
        for value in ranges {
            var range = CFRange()
            guard AXValueGetType(value) == .cfRange, AXValueGetValue(value, .cfRange, &range),
                  range.location >= 0, range.length >= 0 else { return ("providerError", nil) }
            guard range.length <= selectionUnits - units else { return ("selectionTooLarge", nil) }
            var partValue: CFTypeRef?
            let error = AXUIElementCopyParameterizedAttributeValue(element,
                kAXStringForRangeParameterizedAttribute as CFString, value, &partValue)
            guard error == .success, let part = partValue as? String,
                  part.utf16.count == range.length else { return (axFailure(error), nil) }
            text += part
            units += range.length
        }
        return (text.isEmpty ? "empty" : "ok", text)
    }
    var selected: CFTypeRef?
    let error = AXUIElementCopyAttributeValue(element, kAXSelectedTextAttribute as CFString, &selected)
    guard error == .success, let text = selected as? String else { return (axFailure(error), nil) }
    guard text.utf16.count <= selectionUnits else { return ("selectionTooLarge", nil) }
    // Whitespace and embedded NUL are meaningful text; normalization belongs to P11.
    return (text.isEmpty ? "empty" : "ok", text)
}
