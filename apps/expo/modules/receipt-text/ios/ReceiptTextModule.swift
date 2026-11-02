import ExpoModulesCore
import ImageIO
import Vision

public class ReceiptTextModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReceiptText")

    AsyncFunction("recognizeLines") { (uri: URL, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard let source = CGImageSourceCreateWithURL(uri as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
        else {
          promise.resolve([])
          return
        }
        let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
        let orientation = (properties?[kCGImagePropertyOrientation] as? UInt32)
          .flatMap(CGImagePropertyOrientation.init(rawValue:)) ?? .up

        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        do {
          try VNImageRequestHandler(cgImage: image, orientation: orientation).perform([request])
        } catch {
          promise.resolve([])
          return
        }

        // Vision measures from the bottom left; the app draws from the top left
        let lines: [[String: Any]] = (request.results ?? []).compactMap { observation in
          guard let text = observation.topCandidates(1).first?.string else { return nil }
          let box = observation.boundingBox
          return [
            "text": text,
            "x": box.minX,
            "y": 1 - box.maxY,
            "width": box.width,
            "height": box.height,
          ]
        }
        promise.resolve(lines)
      }
    }
  }
}
