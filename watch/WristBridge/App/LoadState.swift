/// The three states every remote screen can be in.
enum LoadState<Value> {
    case loading
    case loaded(Value, isStale: Bool)
    case failed(String)
}
