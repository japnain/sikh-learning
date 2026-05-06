import SwiftUI
import UIKit

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: alpha
        )
    }

    static func naamAdaptive(light: UInt, dark: UInt, alpha: Double = 1) -> Color {
        Color(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light, alpha: alpha)
        })
    }

    static let naamInk = Color.naamAdaptive(light: 0x21170f, dark: 0xf6ead8)
    static let naamSage = Color.naamAdaptive(light: 0x456653, dark: 0x91b59e)
    static let naamDeep = Color.naamAdaptive(light: 0x15110b, dark: 0xf3e3c4)
    static let naamGold = Color.naamAdaptive(light: 0xbe8133, dark: 0xe8c776)
    static let naamParchment = Color.naamAdaptive(light: 0xf8ecd9, dark: 0x17131f)
    static let naamMist = Color.naamAdaptive(light: 0xefe4d1, dark: 0x211a2c)
    static let naamSurface = Color.naamAdaptive(light: 0xfffbf2, dark: 0x251d31)
    static let naamSurfaceMuted = Color.naamAdaptive(light: 0xf1dfc2, dark: 0x1b1525)
    static let naamBorder = Color.naamAdaptive(light: 0xd4b985, dark: 0x4a3a5e)
}

extension UIColor {
    convenience init(hex: UInt, alpha: Double = 1) {
        self.init(
            red: CGFloat((hex >> 16) & 0xff) / 255,
            green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255,
            alpha: CGFloat(alpha)
        )
    }
}

struct NativeBackground: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        LinearGradient(
            colors: colorScheme == .dark
                ? [Color(hex: 0x15101d), Color(hex: 0x20182a), Color(hex: 0x17131f)]
                : [Color(hex: 0xfbf1df), Color(hex: 0xf3e4cb), Color(hex: 0xe6d2b2)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
        .overlay {
            Image("ManuscriptTexture")
                .resizable()
                .scaledToFill()
                .opacity(colorScheme == .dark ? 0.035 : 0.07)
                .blendMode(.multiply)
                .ignoresSafeArea()
        }
    }
}

struct NativeCard<Content: View>: View {
    var tint: Color = .naamSage
    var padding: CGFloat = 16
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.naamSurface.opacity(0.96),
                                Color.naamSurfaceMuted.opacity(0.82)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .stroke(tint.opacity(0.28), lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.10), radius: 18, x: 0, y: 10)
            )
    }
}

struct FlowHero: View {
    var imageName: String
    var eyebrow: String
    var title: String
    var subtitle: String
    var symbolName: String
    var progressTitle: String?
    var progressValue: Double?

    var body: some View {
        NativeCard(tint: .naamGold, padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                GeometryReader { proxy in
                    ZStack(alignment: .bottomLeading) {
                        Image(imageName)
                            .resizable()
                            .scaledToFill()
                            .frame(width: proxy.size.width, height: 206)
                            .clipped()
                            .accessibilityHidden(true)

                        LinearGradient(
                            colors: [
                                Color.black.opacity(0.02),
                                Color.black.opacity(0.32)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )

                        HStack(spacing: 8) {
                            Image(systemName: symbolName)
                                .font(.footnote.weight(.semibold))
                            Text(eyebrow.uppercased())
                                .font(.caption.weight(.semibold))
                        }
                        .foregroundStyle(Color.white.opacity(0.92))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.black.opacity(0.24), in: Capsule())
                        .padding(14)
                    }
                }
                .frame(height: 206)

                VStack(alignment: .leading, spacing: 13) {
                    Text(title)
                        .font(.title.bold())
                        .foregroundStyle(Color.naamInk)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(subtitle)
                        .foregroundStyle(Color.naamInk.opacity(0.68))
                        .fixedSize(horizontal: false, vertical: true)
                    if let progressTitle, let progressValue {
                        ProgressPill(title: progressTitle, value: progressValue)
                    }
                }
                .padding(16)
            }
        }
    }
}

struct FlowActionTile: View {
    var title: String
    var subtitle: String
    var systemImage: String
    var tint: Color = .naamSage
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 9) {
                Image(systemName: systemImage)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(tint)
                Text(title)
                    .font(.headline)
                    .foregroundStyle(Color.naamInk)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(Color.naamInk.opacity(0.58))
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, minHeight: 118, alignment: .topLeading)
            .padding(14)
            .background(Color.naamSurface.opacity(0.70), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(tint.opacity(0.18), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct FlowSavedFooter: View {
    var title: String
    var subtitle: String
    var value: String
    var symbolName: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        NativeCard(tint: .naamGold) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: symbolName)
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(Color.naamGold)
                        .frame(width: 38, height: 38)
                        .background(Color.naamGold.opacity(0.14), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    VStack(alignment: .leading, spacing: 4) {
                        Eyebrow(text: "Saved at bottom")
                        Text(title)
                            .font(.headline)
                            .foregroundStyle(Color.naamInk)
                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundStyle(Color.naamInk.opacity(0.62))
                    }
                    Spacer(minLength: 8)
                    Text(value)
                        .font(.headline.monospacedDigit())
                        .foregroundStyle(Color.naamInk)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(Color.naamParchment.opacity(0.82), in: Capsule())
                }
                if let actionTitle, let action {
                    Button(action: action) {
                        Label(actionTitle, systemImage: "arrow.right")
                            .font(.subheadline.weight(.semibold))
                    }
                    .buttonStyle(.bordered)
                    .tint(Color.naamSage)
                }
            }
        }
    }
}

struct Eyebrow: View {
    var text: String

    var body: some View {
        Text(text.uppercased())
            .font(.caption.weight(.semibold))
            .foregroundStyle(Color.naamSage)
            .accessibilityHidden(true)
    }
}

struct PrimaryActionButton: View {
    var title: String
    var systemImage: String = "arrow.right"
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(title)
                Image(systemName: systemImage)
            }
            .font(.headline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .foregroundStyle(Color.naamParchment)
            .background(Color.naamDeep, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("native-primary-action")
    }
}

struct SelectableRow: View {
    var title: String
    var subtitle: String
    var selected: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(selected ? Color.naamGold : Color.naamSage.opacity(0.55))
                    .font(.title3)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(Color.naamInk)
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(Color.naamInk.opacity(0.64))
                }
                Spacer(minLength: 0)
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(selected ? Color.naamGold.opacity(0.18) : Color.white.opacity(0.42))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .stroke(selected ? Color.naamGold.opacity(0.7) : Color.naamSage.opacity(0.15), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

struct ProgressPill: View {
    var title: String
    var value: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.caption.weight(.semibold))
                Spacer()
                Text(value, format: .percent.precision(.fractionLength(0)))
                    .font(.caption.monospacedDigit())
            }
            ProgressView(value: value)
                .tint(Color.naamGold)
        }
        .foregroundStyle(Color.naamInk)
    }
}
