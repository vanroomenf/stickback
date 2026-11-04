// Two things Expo can't do on iPhone:
//  - cutOutSubject: finds the subject of a photo (person, pet, object) like Photos' "lift subject" does,
//    and returns it on a transparent background, plain and with a white sticker border (iOS 17+)
//  - copySticker: puts a sticker on the clipboard as a real transparent PNG (not a JPEG), so chat apps
//    keep its shape when you paste it
import ExpoModulesCore
import UIKit
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import UniformTypeIdentifiers

final class StickbackException: Exception {
  let why: String
  init(_ why: String) { self.why = why; super.init() }
  override var reason: String { why }
}

public class StickbackNativeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StickbackNative")

    Function("canCutOut") { () -> Bool in
      if #available(iOS 17.0, *) { return true }
      return false
    }

    AsyncFunction("cutOutSubject") { (uri: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard #available(iOS 17.0, *) else { promise.reject(StickbackException("needs iOS 17")); return }
        do { promise.resolve(try Self.cutOut(uri)) }
        catch let e as Exception { promise.reject(e) }
        catch { promise.reject(StickbackException(error.localizedDescription)) }
      }
    }

    AsyncFunction("copySticker") { (uri: String) throws -> Bool in
      guard let data = Self.load(uri), let image = UIImage(data: data), let png = image.pngData() else {
        throw StickbackException("can't read the sticker")
      }
      var item: [String: Any] = [UTType.png.identifier: png]
      if uri.lowercased().hasSuffix(".webp") || Self.isWebP(data) { item[UTType.webP.identifier] = data }
      UIPasteboard.general.setItems([item])
      return true
    }.runOnQueue(.main)
  }

  static func load(_ uri: String) -> Data? {
    if let url = URL(string: uri), url.isFileURL { return try? Data(contentsOf: url) }
    return try? Data(contentsOf: URL(fileURLWithPath: uri))
  }

  static func isWebP(_ d: Data) -> Bool {
    d.count > 12 && d[0] == 0x52 && d[1] == 0x49 && d[2] == 0x46 && d[3] == 0x46 && d[8] == 0x57 && d[9] == 0x45 && d[10] == 0x42 && d[11] == 0x50
  }

  // Upright and not too big (Vision is quicker and the sticker ends up 512 px anyway)
  static func upright(_ img: UIImage, maxSide: CGFloat) -> UIImage {
    let side = max(img.size.width, img.size.height)
    let s = min(1, maxSide / side)
    let size = CGSize(width: floor(img.size.width * s), height: floor(img.size.height * s))
    let f = UIGraphicsImageRendererFormat.default()
    f.scale = 1
    return UIGraphicsImageRenderer(size: size, format: f).image { _ in img.draw(in: CGRect(origin: .zero, size: size)) }
  }

  @available(iOS 17.0, *)
  static func cutOut(_ uri: String) throws -> [String: Any] {
    guard let data = load(uri), let original = UIImage(data: data), let cg = upright(original, maxSide: 1200).cgImage else {
      throw StickbackException("can't read the photo")
    }
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    let request = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([request])
    guard let result = request.results?.first, !result.allInstances.isEmpty else { return ["found": false] }

    let buffer = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
    let raw = CIImage(cvPixelBuffer: buffer)
    let subject = raw.transformed(by: CGAffineTransform(translationX: -raw.extent.minX, y: -raw.extent.minY))

    // White border: the subject's silhouette in white, grown by a few pixels, under the subject
    let r = max(6, max(subject.extent.width, subject.extent.height) * 0.035)
    let area = subject.extent.insetBy(dx: -r * 1.4, dy: -r * 1.4)
    let silhouette = CIFilter.blendWithAlphaMask()
    silhouette.inputImage = CIImage(color: .white).cropped(to: area)
    silhouette.backgroundImage = CIImage(color: .clear).cropped(to: area)
    silhouette.maskImage = subject
    let grow = CIFilter.morphologyMaximum()
    grow.inputImage = silhouette.outputImage
    grow.radius = Float(r)
    guard let border = grow.outputImage?.cropped(to: area) else { throw StickbackException("border failed") }
    let bordered = subject.composited(over: border).cropped(to: area)
    let outlined = bordered.transformed(by: CGAffineTransform(translationX: -area.minX, y: -area.minY))

    let ctx = CIContext()
    let space = CGColorSpace(name: CGColorSpace.sRGB)!
    func save(_ img: CIImage, _ name: String) throws -> String {
      guard let png = ctx.pngRepresentation(of: img, format: .RGBA8, colorSpace: space) else { throw StickbackException("png failed") }
      let url = FileManager.default.temporaryDirectory.appendingPathComponent("stickback-\(name)-\(UUID().uuidString).png")
      try png.write(to: url)
      return url.absoluteString
    }
    return [
      "found": true,
      "uri": try save(subject, "subject"),
      "width": subject.extent.width,
      "height": subject.extent.height,
      "outlinedUri": try save(outlined, "outlined"),
      "outlinedWidth": outlined.extent.width,
      "outlinedHeight": outlined.extent.height,
    ]
  }
}
