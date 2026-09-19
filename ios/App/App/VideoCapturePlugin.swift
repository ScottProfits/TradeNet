import Foundation
import Capacitor
import UIKit

// Records video through the native UIImagePickerController camera at full
// quality (.typeHigh), instead of the HTML <input capture> flow that
// WebKit silently caps to a much lower preset. Photos already come
// through at full quality via the web file input, so this plugin only
// handles the video case.
@objc(VideoCapturePlugin)
public class VideoCapturePlugin: CAPPlugin, CAPBridgedPlugin, UIImagePickerControllerDelegate, UINavigationControllerDelegate, UIAdaptivePresentationControllerDelegate {
    public let identifier = "VideoCapturePlugin"
    public let jsName = "VideoCapture"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "captureVideo", returnType: CAPPluginReturnPromise)
    ]

    private var savedCall: CAPPluginCall?
    private var dismissWatchdog: Timer?
    private weak var activePicker: UIImagePickerController?

    @objc func captureVideo(_ call: CAPPluginCall) {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            call.reject("Camera not available")
            return
        }
        // A previous call that never got a delegate callback (e.g. the
        // built-in trim screen's own Cancel, which doesn't reliably call
        // back through UIImagePickerControllerDelegate) must not be left
        // hanging when a new capture starts.
        savedCall?.reject("Cancelled")
        savedCall = call
        DispatchQueue.main.async {
            let picker = UIImagePickerController()
            picker.sourceType = .camera
            picker.mediaTypes = ["public.movie"]
            picker.videoQuality = .typeHigh
            // Built-in trim UI after recording — drag the in/out handles,
            // then "Choose" to use the trimmed range.
            picker.allowsEditing = true
            picker.delegate = self
            picker.modalPresentationStyle = .fullScreen
            picker.presentationController?.delegate = self
            self.activePicker = picker
            self.bridge?.viewController?.present(picker, animated: true)
            self.startDismissWatchdog()
        }
    }

    // Belt-and-suspenders: the trim/edit screen shown when allowsEditing
    // is on doesn't reliably route its own Cancel button through either
    // UIImagePickerControllerDelegate or UIAdaptivePresentationControllerDelegate,
    // so poll for the picker silently disappearing and treat that as a
    // cancel too — otherwise the JS promise only ever gets resolved by our
    // 15s client-side timeout, which is what "nothing happens" looks like.
    private func startDismissWatchdog() {
        dismissWatchdog?.invalidate()
        dismissWatchdog = Timer.scheduledTimer(withTimeInterval: 0.4, repeats: true) { [weak self] timer in
            guard let self else { timer.invalidate(); return }
            guard let picker = self.activePicker else { timer.invalidate(); return }
            if picker.presentingViewController == nil || picker.view.window == nil {
                timer.invalidate()
                self.dismissWatchdog = nil
                self.activePicker = nil
                self.savedCall?.reject("Cancelled")
                self.savedCall = nil
            }
        }
    }

    private func stopDismissWatchdog() {
        dismissWatchdog?.invalidate()
        dismissWatchdog = nil
        activePicker = nil
    }

    public func imagePickerController(
        _ picker: UIImagePickerController,
        didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
    ) {
        stopDismissWatchdog()
        picker.dismiss(animated: true)
        guard let url = info[.mediaURL] as? URL else {
            savedCall?.reject("No video captured")
            savedCall = nil
            return
        }
        savedCall?.resolve(["path": url.absoluteString])
        savedCall = nil
    }

    public func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        stopDismissWatchdog()
        picker.dismiss(animated: true)
        savedCall?.reject("Cancelled")
        savedCall = nil
    }

    // Safety net: covers any dismissal that doesn't go through the two
    // delegate methods above, so the JS promise never hangs indefinitely.
    public func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        stopDismissWatchdog()
        savedCall?.reject("Cancelled")
        savedCall = nil
    }
}
