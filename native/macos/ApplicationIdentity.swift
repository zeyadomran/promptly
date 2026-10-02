import Foundation

// Public NSObject equality represents the OS process lifetime, rather than a bare PID.
protocol ApplicationLifetime: NSObjectProtocol {
    var processIdentifier: Int32 { get }
    var launchDate: Date? { get }
    var bundleIdentifier: String? { get }
    var isTerminated: Bool { get }
}

func validApplicationIdentity<Application: ApplicationLifetime>(
    retained: Application, fresh: Application?, pid: Int32,
    started: Date?, bundle: String?, foreground: Application?, requireForeground: Bool
) -> Bool {
    guard pid > 0, !retained.isTerminated, retained.processIdentifier == pid,
          retained.bundleIdentifier == bundle,
          let current = fresh, !current.isTerminated, current.processIdentifier == pid,
          retained.isEqual(current), current.bundleIdentifier == bundle else { return false }
    // LaunchServices birth metadata supplements OS object identity when it was available.
    if let started = started, current.launchDate != started { return false }
    if requireForeground {
        guard let active = foreground, !active.isTerminated,
              active.processIdentifier == pid, active.bundleIdentifier == bundle,
              retained.isEqual(active) else { return false }
    }
    return true
}
