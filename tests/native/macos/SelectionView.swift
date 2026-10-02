import AppKit

// Read the owned ordinary selection without changing its ranges or pasteboard.
final class SelectionView: NSTextView {
    override func accessibilityString(for range: NSRange) -> String? {
        return (string as NSString).substring(with: range)
    }
}
