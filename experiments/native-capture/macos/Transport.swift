import Foundation

let selectionUnits = 1048576
// Six ASCII bytes per UTF-16 unit for worst-case escaping, plus metadata allowance.
let frameBytes = selectionUnits * 6 + 65536
let outputLock = NSLock()

func emit(_ response: [String: Any]) {
    outputLock.lock()
    defer { outputLock.unlock() }
    var encoded: Data?
    if JSONSerialization.isValidJSONObject(response) {
        encoded = try? JSONSerialization.data(withJSONObject: response, options: [.sortedKeys])
    }
    if encoded.map({ $0.count > frameBytes }) ?? true {
        let failure: [String: Any] = ["v": 1, "id": response["id"] as? String ?? "invalid", "status": "selectionTooLarge"]
        encoded = try? JSONSerialization.data(withJSONObject: failure, options: [.sortedKeys])
    }
    guard let data = encoded, let line = String(data: data, encoding: .utf8) else { return }
    print(line)
    fflush(stdout)
}

func fixturePayload(_ request: [String: Any]) -> [String: Any] {
    guard let units = jsonInteger(request["units"]), units >= 0 else { return ["status": "invalidRequest"] }
    if units > selectionUnits { return ["status": "selectionTooLarge"] }
    let character: String
    switch request["pattern"] as? String {
    case "emoji":
        let text = String(repeating: "😀", count: Int(units) / 2) + (units % 2 == 0 ? "" : "雪")
        return ["status": "ok", "text": text, "characterCount": units]
    case "quotes": character = "\""
    case "controls": character = "\u{0001}"
    case "unicode": character = "雪"
    default: return ["status": "invalidRequest"]
    }
    let text = String(repeating: character, count: Int(units))
    return ["status": "ok", "text": text, "characterCount": units]
}
