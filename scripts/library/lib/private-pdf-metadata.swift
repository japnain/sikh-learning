import Foundation
import PDFKit
import AppKit

// Trusted local import helper. No document JavaScript or external links run.
guard CommandLine.arguments.count == 3,
      let document = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1])),
      !document.isLocked,
      document.pageCount > 0,
      let first = document.page(at: 0) else {
    fputs("Could not open PDF for private import\n", stderr)
    exit(1)
}
let bounds = first.bounds(for: .cropBox)
let width = 480.0
let height = width * bounds.height / max(1, bounds.width)
let image = first.thumbnail(of: NSSize(width: width, height: height), for: .cropBox)
guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let jpeg = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.82]) else {
    fputs("Could not create PDF cover\n", stderr)
    exit(1)
}
do {
    try jpeg.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
    var outline: [[String: Any]] = []
    func visit(_ node: PDFOutline) {
        if let destination = node.destination,
           let page = destination.page,
           let title = node.label {
            outline.append(["title": title, "page": document.index(for: page) + 1])
        }
        for index in 0..<node.numberOfChildren {
            if let child = node.child(at: index) { visit(child) }
        }
    }
    if let root = document.outlineRoot { visit(root) }
    let result: [String: Any] = ["pageCount": document.pageCount, "outline": outline]
    let data = try JSONSerialization.data(withJSONObject: result)
    print(String(data: data, encoding: .utf8)!)
} catch {
    fputs("PDF metadata extraction failed\n", stderr)
    exit(1)
}
