import WatchKit

enum Haptics {
    static func success() { WKInterfaceDevice.current().play(.success) }
    static func failure() { WKInterfaceDevice.current().play(.failure) }
    static func tap() { WKInterfaceDevice.current().play(.click) }
}
