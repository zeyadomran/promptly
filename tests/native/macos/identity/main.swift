import Foundation

// Owned immutable lifetime tokens model NSRunningApplication's documented NSObject equality.
final class OwnedApplication: NSObject, ApplicationLifetime {
    let processIdentifier: Int32
    let launchDate: Date?
    let bundleIdentifier: String?
    let lifetime: Int
    var isTerminated = false

    init(pid: Int32 = 7, started: Date? = nil, bundle: String? = "dev.promptly.fixture",
         lifetime: Int = 1) {
        self.processIdentifier = pid
        self.launchDate = started
        self.bundleIdentifier = bundle
        self.lifetime = lifetime
        super.init()
    }

    override func isEqual(_ object: Any?) -> Bool {
        guard let other = object as? OwnedApplication else { return false }
        return lifetime == other.lifetime
    }

    override var hash: Int { lifetime }
}

let retained = OwnedApplication()
let equalFresh = OwnedApplication()
var passed = 0
func check(_ name: String, _ expected: Bool, fresh: OwnedApplication?,
           original: OwnedApplication = retained, pid: Int32 = 7,
           started: Date? = nil, bundle: String? = "dev.promptly.fixture",
           foreground: OwnedApplication? = nil, requireForeground: Bool = false) {
    let actual = validApplicationIdentity(retained: original, fresh: fresh, pid: pid,
        started: started, bundle: bundle, foreground: foreground, requireForeground: requireForeground)
    guard actual == expected else { fatalError("Owned identity regression: " + name) }
    passed += 1
}

// Distinct objects are valid when OS lifetime equality agrees, even without launch metadata.
precondition(retained !== equalFresh)
check("equal nil-date lifetime", true, fresh: equalFresh)
check("same PID and bundle different lifetime", false, fresh: OwnedApplication(lifetime: 2))
let birth = Date(timeIntervalSince1970: 100)
let dated = OwnedApplication(started: birth)
check("available birth metadata", true, fresh: OwnedApplication(started: birth),
    original: dated, started: birth)
check("same PID bundle and birth but restarted", false,
    fresh: OwnedApplication(started: birth, lifetime: 2), original: dated, started: birth)
check("changed birth metadata", false, fresh: OwnedApplication(started: birth.addingTimeInterval(1)),
    original: dated, started: birth)
check("lost recorded birth metadata", false, fresh: equalFresh, original: dated, started: birth)
check("supplemental date can become available", true, fresh: OwnedApplication(started: birth))
check("missing fresh application", false, fresh: nil)
check("different fresh PID", false, fresh: OwnedApplication(pid: 8))
check("invalid PID", false, fresh: equalFresh, pid: 0)
check("changed bundle", false, fresh: OwnedApplication(bundle: "dev.promptly.other"))
check("changed retained bundle", false, fresh: equalFresh,
    original: OwnedApplication(bundle: "dev.promptly.other"))
check("lost bundle", false, fresh: OwnedApplication(bundle: nil))
check("equal nil bundle lifetime", true, fresh: OwnedApplication(bundle: nil),
    original: OwnedApplication(bundle: nil), bundle: nil)
let terminated = OwnedApplication()
terminated.isTerminated = true
check("terminated retained application", false, fresh: equalFresh, original: terminated)
check("terminated fresh application", false, fresh: terminated)
check("equal foreground lifetime", true, fresh: equalFresh,
    foreground: OwnedApplication(), requireForeground: true)
check("missing foreground", false, fresh: equalFresh, requireForeground: true)
check("changed foreground PID", false, fresh: equalFresh,
    foreground: OwnedApplication(pid: 8), requireForeground: true)
check("same foreground PID reused", false, fresh: equalFresh,
    foreground: OwnedApplication(lifetime: 2), requireForeground: true)
check("changed foreground bundle", false, fresh: equalFresh,
    foreground: OwnedApplication(bundle: "dev.promptly.other"), requireForeground: true)
check("terminated foreground", false, fresh: equalFresh,
    foreground: terminated, requireForeground: true)
print("Owned application identity regressions passed: \(passed)")
