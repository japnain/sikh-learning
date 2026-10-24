import Capacitor
import ImageIO
import Photos
import UIKit

class NaamRasBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        if let background = UIColor(named: "LaunchBackground") {
            webView?.backgroundColor = background
            webView?.scrollView.backgroundColor = background
        }
        bridge?.registerPluginInstance(NaamRasImageSharePlugin())
    }
}

/// App-local bridge: PNGs never leave the device until the user chooses a target.
@objc(NaamRasImageSharePlugin)
public class NaamRasImageSharePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NaamRasImageSharePlugin"
    public let jsName = "NaamRasImageShare"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]
    private enum RequestPhase { case preparing, authorizingPhotos, systemAction }
    private struct ImageRequest {
        let id: String
        let call: CAPPluginCall
        var phase: RequestPhase = .preparing
        var directory: URL?
    }
    // Request state is accessed only on the main queue. Early cancellations
    // cover bridge messages arriving before their preparation task starts.
    private var activeRequest: ImageRequest?
    private var earlyCancellations: [String: TimeInterval] = [:]
    private let byteLimit = 24 * 1024 * 1024

    @objc func share(_ call: CAPPluginCall) { perform(call, saveToPhotos: false) }
    @objc func save(_ call: CAPPluginCall) { perform(call, saveToPhotos: true) }

    @objc func cancel(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let requestId = call.getString("requestId"), !requestId.isEmpty, requestId.count <= 160 else {
                call.reject("The image request is invalid.", "INVALID_REQUEST")
                return
            }
            if let request = self.activeRequest, request.id == requestId {
                guard request.phase != .systemAction else {
                    // A presented share sheet or committed Photos write belongs
                    // to the OS. Closing the composer must not undo that action.
                    call.resolve(["status": "ignored"])
                    return
                }
                self.activeRequest = nil
                if let directory = request.directory { try? FileManager.default.removeItem(at: directory) }
                request.call.resolve(["status": "cancelled"])
            } else {
                let now = Date().timeIntervalSinceReferenceDate
                self.earlyCancellations = self.earlyCancellations.filter { now - $0.value < 60 }
                if self.earlyCancellations.count >= 128,
                   let oldest = self.earlyCancellations.min(by: { $0.value < $1.value })?.key {
                    self.earlyCancellations.removeValue(forKey: oldest)
                }
                self.earlyCancellations[requestId] = now
            }
            call.resolve(["status": "cancelled"])
        }
    }

    private func finishRequest(_ requestId: String) -> Bool {
        guard activeRequest?.id == requestId else { return false }
        activeRequest = nil
        return true
    }

    private func perform(_ call: CAPPluginCall, saveToPhotos: Bool) {
        DispatchQueue.main.async {
            let requestId = call.getString("requestId") ?? UUID().uuidString
            guard !requestId.isEmpty, requestId.count <= 160 else {
                call.reject("The image request is invalid.", "INVALID_REQUEST")
                return
            }
            if let cancelledAt = self.earlyCancellations.removeValue(forKey: requestId),
               Date().timeIntervalSinceReferenceDate - cancelledAt < 60 {
                call.resolve(["status": "cancelled"])
                return
            }
            guard self.activeRequest == nil, let presenter = self.bridge?.viewController,
                  presenter.viewIfLoaded?.window != nil,
                  presenter.presentedViewController == nil,
                  UIApplication.shared.applicationState == .active else {
                call.reject("Another action is open. Return to NaamRas and try again.", "BUSY")
                return
            }
            self.activeRequest = ImageRequest(id: requestId, call: call)
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let (directory, files) = try self.prepareFiles(call)
                    DispatchQueue.main.async {
                        guard self.activeRequest?.id == requestId else {
                            try? FileManager.default.removeItem(at: directory)
                            return
                        }
                        self.activeRequest?.directory = directory
                        if saveToPhotos {
                            self.saveFiles(files, directory: directory, requestId: requestId, call: call)
                        } else {
                            self.shareFiles(files, directory: directory, presenter: presenter, requestId: requestId, call: call)
                        }
                    }
                } catch {
                    DispatchQueue.main.async {
                        guard self.finishRequest(requestId) else { return }
                        call.reject("The image could not be prepared.", "INVALID_IMAGE")
                    }
                }
            }
        }
    }

    private func prepareFiles(_ call: CAPPluginCall) throws -> (URL, [URL]) {
        guard let images = call.getArray("files", JSObject.self), !images.isEmpty, images.count <= 12 else {
            throw ImageError.invalid
        }
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("NaamRasShare-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)
        do {
            var total = 0
            var urls: [URL] = []
            for (index, image) in images.enumerated() {
                guard let encoded = image["data"] as? String,
                      encoded.utf8.count <= ((byteLimit - total + 2) / 3) * 4,
                      let data = Data(base64Encoded: encoded), !data.isEmpty,
                      data.starts(with: [137, 80, 78, 71, 13, 10, 26, 10]),
                      let source = CGImageSourceCreateWithData(data as CFData, nil),
                      CGImageSourceGetCount(source) == 1,
                      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
                      let width = properties[kCGImagePropertyPixelWidth] as? Int,
                      let height = properties[kCGImagePropertyPixelHeight] as? Int,
                      width > 0, width <= 1080, height > 0, height <= 8192 else {
                    throw ImageError.invalid
                }
                total += data.count
                guard total <= byteLimit else { throw ImageError.invalid }
                let original = (image["name"] as? String ?? "naamras-hukamnama.png") as NSString
                let stem = (original.lastPathComponent as NSString).deletingPathExtension
                    .replacingOccurrences(of: "[^A-Za-z0-9_-]", with: "-", options: .regularExpression)
                let name = stem.isEmpty ? "naamras-hukamnama" : String(stem.prefix(100))
                let url = directory.appendingPathComponent("\(index + 1)-\(name).png")
                try data.write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
                urls.append(url)
            }
            return (directory, urls)
        } catch {
            try? FileManager.default.removeItem(at: directory)
            throw error
        }
    }

    private func shareFiles(_ files: [URL], directory: URL, presenter: UIViewController, requestId: String, call: CAPPluginCall) {
        guard presenter.presentedViewController == nil,
              presenter.viewIfLoaded?.window != nil,
              UIApplication.shared.applicationState == .active else {
            _ = finishRequest(requestId)
            try? FileManager.default.removeItem(at: directory)
            call.reject("Return to NaamRas and try again.", "BUSY")
            return
        }
        var items: [Any] = files
        if let text = call.getString("text"), !text.isEmpty { items.append(String(text.prefix(128_000))) }
        if let value = call.getString("url"), let url = URL(string: value), url.scheme == "https" {
            items.append(url)
        }
        let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let title = call.getString("title") { sheet.setValue(String(title.prefix(200)), forKey: "subject") }
        if let popover = sheet.popoverPresentationController {
            popover.sourceView = presenter.view
            popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.maxY - 80, width: 1, height: 1)
            popover.permittedArrowDirections = []
        }
        sheet.completionWithItemsHandler = { _, completed, _, error in
            DispatchQueue.main.async {
                guard self.finishRequest(requestId) else { return }
                if error != nil { call.reject("The share action did not complete.", "SHARE_FAILED") }
                else { call.resolve(["status": completed ? "shared" : "cancelled"]) }
                // Allow the chosen extension to finish reading our private temporary files.
                DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 60) {
                    try? FileManager.default.removeItem(at: directory)
                }
            }
        }
        activeRequest?.phase = .systemAction
        presenter.present(sheet, animated: true)
    }

    private func saveFiles(_ files: [URL], directory: URL, requestId: String, call: CAPPluginCall) {
        // Add-only access: NaamRas never requests to read the user's photo library.
        activeRequest?.phase = .authorizingPhotos
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            DispatchQueue.main.async {
                guard self.activeRequest?.id == requestId else {
                    try? FileManager.default.removeItem(at: directory)
                    return
                }
                guard status == .authorized || status == .limited else {
                    _ = self.finishRequest(requestId)
                    try? FileManager.default.removeItem(at: directory)
                    call.reject("Allow NaamRas to add photos in Settings, or share to Files.", "PHOTO_PERMISSION")
                    return
                }
                self.activeRequest?.phase = .systemAction
                PHPhotoLibrary.shared().performChanges({
                    for file in files { PHAssetChangeRequest.creationRequestForAssetFromImage(atFileURL: file) }
                }) { success, _ in
                    DispatchQueue.main.async {
                        guard self.finishRequest(requestId) else { return }
                        try? FileManager.default.removeItem(at: directory)
                        if success { call.resolve(["status": "saved"]) }
                        else { call.reject("The image could not be saved to Photos.", "SAVE_FAILED") }
                    }
                }
            }
        }
    }

    private enum ImageError: Error { case invalid }
}
