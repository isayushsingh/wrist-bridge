import WatchPreview from "@/components/WatchPreview";

export const metadata = { title: "WristBridge · Watch preview" };

export default function PreviewPage() {
  return (
    <main className="page wide">
      <h1>Watch preview</h1>
      <p className="muted">
        A browser approximation of the SwiftUI renderer. Use it to design screens before opening Xcode.
        Warnings come from the sanitizer (<code>?debug=1</code>).
      </p>
      <WatchPreview />
    </main>
  );
}
