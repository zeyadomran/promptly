import AppKit

extension NSRunningApplication: ApplicationLifetime {}

struct SourceIdentity {
    let pid: pid_t
    let started: Date?
    let bundle: String?
    let token: String
    let source: [String: Any]?
    // Retain the original OS object as well as checking a fresh instance for PID reuse.
    let application: NSRunningApplication
    private static var identities: [String: SourceIdentity] = [:]
    private static var order: [String] = []

    static func record() -> SourceIdentity? {
        guard let app = NSWorkspace.shared.frontmostApplication, !app.isTerminated,
              app.processIdentifier > 0 else { return nil }
        var source: [String: Any]?
        if let bundle = app.bundleIdentifier, let name = app.localizedName,
           bundle.utf16.count <= 255, name.utf16.count <= 255,
           bundle.range(of: "^[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)+$", options: .regularExpression) != nil,
           name.range(of: "^[\\p{L}\\p{N}._ -]{1,255}$", options: .regularExpression) != nil {
            source = ["pid": app.processIdentifier, "name": name, "id": bundle]
        }
        let identity = SourceIdentity(pid: app.processIdentifier, started: app.launchDate,
            bundle: app.bundleIdentifier, token: UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased(),
            source: source, application: app)
        guard identity.valid(foreground: true) else { return nil }
        identities[identity.token] = identity
        order.append(identity.token)
        while order.count > 32 { identities.removeValue(forKey: order.removeFirst()) }
        return identity
    }

    static func resolve(_ token: String) -> SourceIdentity? { identities[token] }

    func valid(foreground: Bool) -> Bool {
        validApplicationIdentity(retained: application,
            fresh: NSRunningApplication(processIdentifier: pid), pid: pid,
            started: started, bundle: bundle,
            foreground: foreground ? NSWorkspace.shared.frontmostApplication : nil,
            requireForeground: foreground)
    }

    func result(_ status: String) -> [String: Any] {
        ["status": status, "identity": token, "source": source as Any? ?? NSNull()]
    }

    func activate() -> String {
        guard valid(foreground: false) else { return "foregroundChanged" }
        guard bundle != nil else { return "activationDenied" }
        // OS-owned application object only. No launching, URLs, paths, shell or AppleScript.
        guard application.activate(options: []) else { return "activationDenied" }
        // Activation is asynchronous. Let OS workspace notifications settle within the
        // production pipe budget; an accepted request alone is not a completed handoff.
        let deadline = ProcessInfo.processInfo.systemUptime + 0.075
        while valid(foreground: false) && !valid(foreground: true) &&
              ProcessInfo.processInfo.systemUptime < deadline {
            RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.005))
        }
        guard valid(foreground: false) else { return "foregroundChanged" }
        return valid(foreground: true) ? "ok" : "activationDenied"
    }
}
