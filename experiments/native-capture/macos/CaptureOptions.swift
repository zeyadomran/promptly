import Foundation

func jsonInteger(_ value: Any?) -> Int64? {
    guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() else { return nil }
    let type = String(cString: number.objCType)
    guard type != "d" && type != "f" else { return nil }
    return number.int64Value
}

func captureOptions(_ request: [String: Any]) -> (pid: Int32, includeText: Bool)? {
    var pid: Int32 = 0
    var includeText = false
    if let supplied = request["expectedPid"] {
        guard let integer = jsonInteger(supplied), integer >= 1, integer <= Int64(Int32.max) else { return nil }
        pid = Int32(integer)
    }
    if let supplied = request["includeText"] {
        guard let boolean = supplied as? NSNumber, CFGetTypeID(boolean) == CFBooleanGetTypeID() else { return nil }
        includeText = boolean.boolValue
    }
    return (pid, includeText)
}
