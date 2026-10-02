import AppKit

// Faults and large payloads live in an owned provider, never in the production helper.
final class SelectionView: NSTextView {
    var mode = "selected"

    override func accessibilitySelectedText() -> String? {
        switch mode {
        case "unsupported": return nil
        case "max": return String(repeating: "\u{0001}", count: 1_048_576)
        case "oversized": return String(repeating: "雪", count: 1_048_577)
        default: return super.accessibilitySelectedText()
        }
    }

    override func accessibilitySelectedTextRanges() -> [NSValue]? {
        if mode == "disjoint" {
            return [NSValue(range: NSRange(location: 0, length: 7)),
                    NSValue(range: NSRange(location: 8, length: 10))]
        }
        if mode == "slow" {
            return (0..<32).map { NSValue(range: NSRange(location: $0, length: 1)) }
        }
        return super.accessibilitySelectedTextRanges()
    }

    override func accessibilityString(for range: NSRange) -> String? {
        if mode == "slow" { Thread.sleep(forTimeInterval: 0.012); return "x" }
        return (string as NSString).substring(with: range)
    }
}
