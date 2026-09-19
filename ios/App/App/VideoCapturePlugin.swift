import Foundation
import Capacitor
import UIKit

// Records video through the native UIImagePickerController camera at full
// quality (.typeHigh), instead of the HTML <input capture> flow that
// WebKit silently caps to a much lower preset. Photos already come
// through at full quality via the web file input, so this plugin only
// handles the video case.
@objc(VideoCapturePlugin)
public class VideoCapturePlugin: CAPPlugin, CAPBridgedPlugin, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    public let identifier = "VideoCapturePlugin"
    public let jsName = "VideoCapture"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "captureVideo", returnType: CAPPluginReturnPromise)
    ]

    private var savedCall: CAPPluginCall?

    @objc func captureVideo(_ call: CAPPluginCall) {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            call.reject("Camera not available")
            return
        }
        savedCall = call
        DispatchQueue.main.async {
            let picker = UIImagePickerController()
            picker.sourceType = .camera
            picker.mediaTypes = ["public.movie"]
            picker.videoQuality = .typeHigh
            picker.delegate = self
            picker.modalPresentationStyle = .fullScreen
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    public func imagePickerController(
        _ picker: UIImagePickerController,
        didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
    ) {
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
        picker.dismiss(animated: true)
        savedCall?.reject("Cancelled")
        savedCall = nil
    }
}
