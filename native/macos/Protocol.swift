import Foundation

let selectionUnits = 1_048_576
let frameBytes = selectionUnits * 6 + 65_536

func jsonInteger(_ value: Any?) -> Int64? {
    guard let number = value as? NSNumber,
          CFGetTypeID(number) != CFBooleanGetTypeID() else { return nil }
    let type = String(cString: number.objCType)
    guard type != "d" && type != "f" else { return nil }
    return number.int64Value
}

func jsonBoolean(_ value: Any?) -> Bool? {
    guard let number = value as? NSNumber,
          CFGetTypeID(number) == CFBooleanGetTypeID() else { return nil }
    return number.boolValue
}

// Read only a bounded byte buffer, even for a caller that never sends a newline.
func readRequest(_ input: FileHandle) -> [String: Any]? {
    var line = Data()
    while let byte = try? input.read(upToCount: 1), !byte.isEmpty {
        if byte[0] == 10 {
            return (try? JSONSerialization.jsonObject(with: line)) as? [String: Any] ?? [:]
        }
        line.append(byte)
        if line.count > 4096 { exit(1) }
    }
    return nil
}

func emit(_ response: [String: Any], id: String) {
    var result = response
    result["v"] = 1
    result["id"] = id
    var data = try? JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    if data.map({ $0.count > frameBytes }) ?? true {
        data = try? JSONSerialization.data(withJSONObject:
            ["v": 1, "id": id, "status": "selectionTooLarge"])
    }
    guard var frame = data else { exit(1) }
    frame.append(10)
    do { try FileHandle.standardOutput.write(contentsOf: frame) }
    catch { exit(1) }
}

func validRequest(_ request: [String: Any]) -> (String, String)? {
    guard jsonInteger(request["v"]) == 1,
          let id = request["id"] as? String, !id.isEmpty, id.utf16.count <= 128,
          let command = request["command"] as? String else { return nil }
    let extras: Set<String>
    switch command {
    case "capture": extras = ["identity", "expectedPid", "includeText"]
    case "activate": extras = ["identity"]
    default: extras = []
    }
    guard Set(request.keys).subtracting(["v", "id", "command"]).isSubset(of: extras) else { return nil }
    return (id, command)
}

func requestToken(_ request: [String: Any]) -> String? {
    guard let token = request["identity"] as? String,
          token.range(of: "^[a-f0-9]{32}$", options: .regularExpression) != nil else { return nil }
    return token
}
