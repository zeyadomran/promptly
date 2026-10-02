import Carbon

/// Exactly two named physical-key controls; never an arbitrary input request.
enum ProbeChord: String {
    case f11 = "ctrl-option-f11"
    case letterK = "ctrl-option-k"

    var keyCode: UInt16 {
        switch self {
        case .f11: return UInt16(kVK_F11)
        case .letterK: return UInt16(kVK_ANSI_K)
        }
    }
}
