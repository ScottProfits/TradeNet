import Capacitor

// Local (non-npm) plugins like VideoCapturePlugin never appear in the
// auto-generated capacitor.config.json "packageClassList" — that list is
// built by the Capacitor CLI from node_modules packages only, so a
// hand-written Swift plugin is silently invisible to Capacitor's default
// registration and calling it from JS fails with "plugin is not
// implemented on ios", even though the class compiles and links fine.
// Registering it explicitly here is the supported way to add a local
// plugin, and it survives every future `npx cap sync` untouched.
class RyzrBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(VideoCapturePlugin())
    }
}
