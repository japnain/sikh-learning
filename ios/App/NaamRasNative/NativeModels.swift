import Foundation

enum AppTab: String, CaseIterable, Identifiable, Codable {
    case home
    case read
    case saved
    case more

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "Home"
        case .read: "Read"
        case .saved: "Saved"
        case .more: "More"
        }
    }

    var symbolName: String {
        switch self {
        case .home: "sparkles"
        case .read: "book.pages"
        case .saved: "bookmark"
        case .more: "ellipsis.circle"
        }
    }
}

enum ScriptMode: String, CaseIterable, Identifiable, Codable {
    case gurmukhi
    case devanagari

    var id: String { rawValue }
    var title: String { self == .gurmukhi ? "Gurmukhi" : "Devanagari" }
}

enum SupportDensity: String, CaseIterable, Identifiable, Codable {
    case full
    case guided
    case light
    case minimal

    var id: String { rawValue }

    var title: String {
        switch self {
        case .full: "Full support"
        case .guided: "Guided support"
        case .light: "Light support"
        case .minimal: "Minimal support"
        }
    }

    var description: String {
        switch self {
        case .full: "Show transliteration, meanings, and source context."
        case .guided: "Keep meanings and pronunciation visible without crowding the line."
        case .light: "Keep the original line central with meanings below."
        case .minimal: "Quiet reading with only core source markers."
        }
    }
}

enum LearningLevel: String, CaseIterable, Identifiable, Codable {
    case beginner
    case familiar
    case dailyReader

    var id: String { rawValue }

    var title: String {
        switch self {
        case .beginner: "Beginning"
        case .familiar: "Familiar"
        case .dailyReader: "Daily reader"
        }
    }
}

enum LearningGoal: String, CaseIterable, Identifiable, Codable {
    case read
    case understand
    case habit

    var id: String { rawValue }

    var title: String {
        switch self {
        case .read: "Read with steadiness"
        case .understand: "Understand more deeply"
        case .habit: "Build a daily rhythm"
        }
    }
}

enum MeaningLanguage: String, CaseIterable, Identifiable, Codable {
    case none
    case english
    case punjabi
    case hindi

    var id: String { rawValue }

    var title: String {
        switch self {
        case .none: "None"
        case .english: "English"
        case .punjabi: "Punjabi"
        case .hindi: "Hindi"
        }
    }
}

enum AppAppearanceMode: String, CaseIterable, Identifiable, Codable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: "System"
        case .light: "Light"
        case .dark: "Dark"
        }
    }
}

struct ReaderPreferences: Codable, Equatable {
    var scriptMode: ScriptMode = .gurmukhi
    var supportDensity: SupportDensity = .guided
    var meaningLanguage: MeaningLanguage = .english
    var transliterationVisible = true
    var fontSize: Double = 24
    var lineSpacing: Double = 12
    var centerAligned = false

    mutating func applySupportDensity(_ density: SupportDensity) {
        supportDensity = density
        switch density {
        case .full:
            meaningLanguage = .english
            transliterationVisible = true
            lineSpacing = 14
        case .guided:
            meaningLanguage = .english
            transliterationVisible = true
            lineSpacing = 12
        case .light:
            meaningLanguage = .english
            transliterationVisible = false
            lineSpacing = 10
        case .minimal:
            meaningLanguage = .none
            transliterationVisible = false
            lineSpacing = 8
        }
    }
}

struct OnboardingProfile: Codable, Equatable {
    var goal: LearningGoal = .habit
    var level: LearningLevel = .beginner
    var audience = "Adult"
    var accountChoice = "Guest"
    var completed = false
}

struct ReadingLine: Identifiable, Codable, Equatable {
    var id: Int
    var gurmukhi: String
    var devanagari: String
    var transliteration: String
    var meaning: String
    var meaningPunjabi: String? = nil
    var meaningHindi: String? = nil
    var source: String
    var vishraamNote: String
    var wordNotes: [WordNote]

    func meaning(for language: MeaningLanguage) -> String {
        switch language {
        case .none: ""
        case .english: meaning
        case .punjabi: meaningPunjabi.flatMap { $0.isEmpty ? nil : $0 } ?? meaning
        case .hindi: meaningHindi.flatMap { $0.isEmpty ? nil : $0 } ?? meaning
        }
    }
}

struct WordNote: Identifiable, Codable, Equatable {
    var id: String { word }
    var word: String
    var pronunciation: String
    var meaning: String
    var source: String
}

struct ReadingItem: Identifiable, Codable, Equatable {
    var id: String
    var title: String
    var subtitle: String
    var category: String
    var source: String
    var progress: Double
    var baniDbId: Int? = nil
    var lines: [ReadingLine]
}

struct BookmarkItem: Identifiable, Codable, Equatable {
    var id: String
    var readingId: String
    var title: String
    var source: String
    var createdAt: Date
}

struct CloudUser: Codable, Equatable {
    var id: String
    var email: String
}

enum CloudSyncStatus: String, Codable, Equatable {
    case localOnly = "Local only"
    case configured = "Supabase ready"
    case authenticating = "Authenticating"
    case signedIn = "Signed in"
    case syncing = "Syncing"
    case synced = "Synced"
    case deleting = "Deleting account"
    case error = "Needs attention"
}

struct NativeSnapshot: Codable, Equatable {
    var profile: OnboardingProfile
    var readerPreferences: ReaderPreferences
    var appearanceMode: AppAppearanceMode
    var bookmarks: [BookmarkItem]
    var readingProgress: [String: Double]
    var exportedAt: Date
}

enum NativeFixtures {
    static let catalogUnavailable = ReadingItem(
        id: "catalog-unavailable",
        title: "Reading catalog unavailable",
        subtitle: "Reconnect and relaunch NaamRas to load the reading catalog.",
        category: "Unavailable",
        source: "NaamRas",
        progress: 0,
        lines: []
    )

    static let dailyLines = [
        ReadingLine(
            id: 1,
            gurmukhi: "ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ",
            devanagari: "ੴ सत नाम करता पुरख",
            transliteration: "Ik Oankaar sat naam kartaa purakh",
            meaning: "The One is true, creative, and present.",
            source: "Sri Guru Granth Sahib Ji, Ang 1",
            vishraamNote: "Pause gently after Sat Naam before carrying the thought forward.",
            wordNotes: [
                WordNote(word: "ਸਤਿ", pronunciation: "sat", meaning: "True, enduring reality.", source: "Mahan Kosh / SGGS usage"),
                WordNote(word: "ਕਰਤਾ", pronunciation: "kartaa", meaning: "The creative doer, the One who brings into being.", source: "Reader glossary")
            ]
        ),
        ReadingLine(
            id: 2,
            gurmukhi: "ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ",
            devanagari: "निरभउ निरवैर अकाल मूरत",
            transliteration: "Nirbhau nirvair akaal moorat",
            meaning: "Without fear, without enmity, beyond time.",
            source: "Sri Guru Granth Sahib Ji, Ang 1",
            vishraamNote: "Let Nirbhau and Nirvair each stand before reading Akaal Moorat.",
            wordNotes: [
                WordNote(word: "ਨਿਰਭਉ", pronunciation: "nirbhau", meaning: "Without fear.", source: "Reader glossary"),
                WordNote(word: "ਨਿਰਵੈਰੁ", pronunciation: "nirvair", meaning: "Without hostility or enmity.", source: "Reader glossary")
            ]
        ),
        ReadingLine(
            id: 3,
            gurmukhi: "ਗੁਰ ਪ੍ਰਸਾਦਿ ॥",
            devanagari: "गुर प्रसाद ॥",
            transliteration: "Gur prasaad",
            meaning: "Known through the Guru's grace.",
            source: "Sri Guru Granth Sahib Ji, Ang 1",
            vishraamNote: "Resolve the line fully here before continuing.",
            wordNotes: [
                WordNote(word: "ਗੁਰ", pronunciation: "gur", meaning: "The Guru, the guiding light.", source: "Reader glossary"),
                WordNote(word: "ਪ੍ਰਸਾਦਿ", pronunciation: "prasaad", meaning: "Grace, blessing, gift.", source: "Reader glossary")
            ]
        )
    ]

}

private struct NativeCatalogPayload: Decodable {
    var readings: [NativeCatalogReading]
}

private struct NativeCatalogReading: Decodable {
    var id: String
    var title: String
    var subtitle: String
    var category: String
    var source: String
    var progress: Double
    var baniDbId: Int?

    func item() -> ReadingItem {
        ReadingItem(
            id: id,
            title: title,
            subtitle: subtitle,
            category: category,
            source: source,
            progress: progress,
            baniDbId: baniDbId,
            lines: []
        )
    }
}

enum NativeCatalogStore {
    private static let payload: NativeCatalogPayload? = {
        guard let url = Bundle.main.url(forResource: "NativeCatalog", withExtension: "json"),
              let data = try? Data(contentsOf: url) else {
            return nil
        }

        return try? JSONDecoder().decode(NativeCatalogPayload.self, from: data)
    }()

    static var readings: [ReadingItem] {
        let items = payload?.readings.map { $0.item() } ?? []
        let availableItems = items.filter { $0.baniDbId != nil }
        return availableItems.isEmpty ? [NativeFixtures.catalogUnavailable] : availableItems
    }
}

enum NativeBaniServiceError: LocalizedError {
    case unavailable
    case invalidResponse
    case emptyReading

    var errorDescription: String? {
        switch self {
        case .unavailable: "This catalog item does not have a native BaniDB reading yet."
        case .invalidResponse: "The scripture service returned an unexpected response."
        case .emptyReading: "No scripture lines were returned for this reading."
        }
    }
}

struct NativeBaniService {
    var baseURL = URL(string: "https://api.banidb.com")!

    func fetchLines(for item: ReadingItem) async throws -> [ReadingLine] {
        guard let baniDbId = item.baniDbId else { throw NativeBaniServiceError.unavailable }

        let url = baseURL.appending(path: "v2/banis/\(baniDbId)")
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw NativeBaniServiceError.invalidResponse
        }

        let payload = try JSONDecoder().decode(NativeBaniPayload.self, from: data)
        let sourceName = payload.baniInfo?.source?.english ?? item.source
        let lines = payload.verses.enumerated().compactMap { index, envelope -> ReadingLine? in
            let verse = envelope.verse
            let gurmukhi = verse.verse?.unicode?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            guard !gurmukhi.isEmpty else { return nil }

            let page = verse.pageNo ?? payload.baniInfo?.source?.pageNo
            let source = page.map { "\(sourceName) · Ang \($0)" } ?? sourceName

            return ReadingLine(
                id: verse.verseId ?? index + 1,
                gurmukhi: gurmukhi,
                devanagari: verse.transliteration?.hindi ?? gurmukhi,
                transliteration: verse.transliteration?.english ?? "",
                meaning: verse.translation?.en?.bdb ?? verse.translation?.en?.ssk ?? verse.translation?.en?.ms ?? "",
                meaningPunjabi: verse.translation?.pu?.ss?.unicode ?? verse.translation?.pu?.ft?.unicode,
                meaningHindi: verse.translation?.hi?.ss ?? verse.translation?.hi?.sts,
                source: source,
                vishraamNote: "",
                wordNotes: []
            )
        }

        guard !lines.isEmpty else { throw NativeBaniServiceError.emptyReading }
        return lines
    }
}

private struct NativeBaniPayload: Decodable {
    var baniInfo: NativeBaniInfo?
    var verses: [NativeBaniEnvelope]
}

private struct NativeBaniInfo: Decodable {
    var source: NativeBaniSource?
}

private struct NativeBaniSource: Decodable {
    var english: String?
    var pageNo: Int?
}

private struct NativeBaniEnvelope: Decodable {
    var verse: NativeBaniVerse
}

private struct NativeBaniVerse: Decodable {
    var verseId: Int?
    var pageNo: Int?
    var verse: NativeBaniScript?
    var transliteration: NativeBaniTransliteration?
    var translation: NativeBaniTranslation?
}

private struct NativeBaniScript: Decodable {
    var unicode: String?
}

private struct NativeBaniTransliteration: Decodable {
    var english: String?
    var hindi: String?
}

private struct NativeBaniTranslation: Decodable {
    var en: NativeBaniEnglishTranslation?
    var pu: NativeBaniPunjabiTranslations?
    var hi: NativeBaniHindiTranslation?
}

private struct NativeBaniEnglishTranslation: Decodable {
    var bdb: String?
    var ms: String?
    var ssk: String?
}

private struct NativeBaniPunjabiTranslations: Decodable {
    var ss: NativeBaniUnicodeTranslation?
    var ft: NativeBaniUnicodeTranslation?
}

private struct NativeBaniUnicodeTranslation: Decodable {
    var unicode: String?
}

private struct NativeBaniHindiTranslation: Decodable {
    var ss: String?
    var sts: String?
}
