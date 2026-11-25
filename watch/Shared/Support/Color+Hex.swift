import SwiftUI

extension Color {
    /// "#RRGGBB" or "#RRGGBBAA". Returns nil for anything else, so callers can fall back.
    init?(hex: String?) {
        guard var string = hex?.trimmingCharacters(in: .whitespaces), string.hasPrefix("#") else { return nil }
        string.removeFirst()
        guard string.count == 6 || string.count == 8, let value = UInt64(string, radix: 16) else { return nil }
        let hasAlpha = string.count == 8
        let r = Double((value >> (hasAlpha ? 24 : 16)) & 0xFF) / 255
        let g = Double((value >> (hasAlpha ? 16 : 8)) & 0xFF) / 255
        let b = Double((value >> (hasAlpha ? 8 : 0)) & 0xFF) / 255
        let a = hasAlpha ? Double(value & 0xFF) / 255 : 1
        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}
