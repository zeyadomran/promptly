/// Only fixed-chord counts and booleans; no text, identities or raw event flags.
struct CarbonObservations {
    private(set) var handlerEntered = 0
    private(set) var parameterFailed = 0
    private(set) var idMismatch = 0
    private(set) var carbonPressed = 0
    private(set) var localDown = 0
    private(set) var localUp = 0
    private(set) var localF11Character = false
    private(set) var localKCharacter = false
    private(set) var localFunction = false
    private(set) var localNumericPad = false

    mutating func enterCarbon() { handlerEntered = min(1024, handlerEntered + 1) }

    mutating func decodeCarbon(succeeded: Bool, signature: UInt32, id: UInt32) -> Bool {
        guard succeeded else {
            parameterFailed = min(1024, parameterFailed + 1)
            return false
        }
        guard signature == 0x50724F62, id == 1 else {
            idMismatch = min(1024, idMismatch + 1)
            return false
        }
        carbonPressed = min(1024, carbonPressed + 1)
        return true
    }

    mutating func recordLocal(down: Bool, f11Character: Bool, function: Bool, numericPad: Bool,
                             kCharacter: Bool = false) {
        if down { localDown = min(1024, localDown + 1) }
        else { localUp = min(1024, localUp + 1) }
        localF11Character = localF11Character || f11Character
        localKCharacter = localKCharacter || kCharacter
        localFunction = localFunction || function
        localNumericPad = localNumericPad || numericPad
    }
}
