import Foundation

enum AppTab: String, CaseIterable, Identifiable, Codable {
    case home
    case read
    case learn
    case saved
    case more

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "Home"
        case .read: "Read"
        case .learn: "Learn"
        case .saved: "Saved"
        case .more: "More"
        }
    }

    var symbolName: String {
        switch self {
        case .home: "sparkles"
        case .read: "book.pages"
        case .learn: "graduationcap"
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
        case .full: "Show transliteration, meanings, vishraam, and source context."
        case .guided: "Keep meanings and pronunciation visible without crowding the line."
        case .light: "Focus the original line and keep help one tap away."
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

struct ReaderPreferences: Codable, Equatable {
    var scriptMode: ScriptMode = .gurmukhi
    var supportDensity: SupportDensity = .guided
    var meaningLanguage: MeaningLanguage = .english
    var transliterationVisible = true
    var vishraamVisible = true
    var fontSize: Double = 24
    var lineSpacing: Double = 12
    var centerAligned = false

    mutating func applySupportDensity(_ density: SupportDensity) {
        supportDensity = density
        switch density {
        case .full:
            meaningLanguage = .english
            transliterationVisible = true
            vishraamVisible = true
            lineSpacing = 14
        case .guided:
            meaningLanguage = .english
            transliterationVisible = true
            vishraamVisible = true
            lineSpacing = 12
        case .light:
            meaningLanguage = .english
            transliterationVisible = false
            vishraamVisible = false
            lineSpacing = 10
        case .minimal:
            meaningLanguage = .none
            transliterationVisible = false
            vishraamVisible = false
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
    var source: String
    var vishraamNote: String
    var wordNotes: [WordNote]
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
    var lines: [ReadingLine]
}

struct LearnItem: Identifiable, Codable, Equatable {
    var id: String
    var title: String
    var category: String
    var summary: String
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
    case error = "Needs attention"
}

struct NativeSnapshot: Codable, Equatable {
    var profile: OnboardingProfile
    var readerPreferences: ReaderPreferences
    var bookmarks: [BookmarkItem]
    var savedLearnItemIds: [String]
    var readingProgress: [String: Double]
    var exportedAt: Date
}

enum NativeFixtures {
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

    static let readings: [ReadingItem] = [
        ReadingItem(
            id: "japji-sahib",
            title: "Japji Sahib",
            subtitle: "Morning Nitnem, Ang 1-8",
            category: "Daily Nitnem",
            source: "SGGS",
            progress: 0.42,
            lines: dailyLines
        ),
        ReadingItem(
            id: "rehras-sahib",
            title: "Rehras Sahib",
            subtitle: "Evening paath with support controls",
            category: "Daily Nitnem",
            source: "SGGS / DG",
            progress: 0.18,
            lines: dailyLines
        ),
        ReadingItem(
            id: "hukamnama",
            title: "Hukamnama",
            subtitle: "Daily reflection with source context",
            category: "Today",
            source: "SGGS",
            progress: 0,
            lines: dailyLines
        ),
        ReadingItem(
            id: "anand-sahib",
            title: "Anand Sahib",
            subtitle: "Full bani reader with meanings and support density",
            category: "Banis",
            source: "SGGS",
            progress: 0.11,
            lines: dailyLines
        ),
        ReadingItem(
            id: "amrit-keertan",
            title: "Amrit Keertan",
            subtitle: "Browse shabad headers and saved hymns",
            category: "Keertan",
            source: "AK",
            progress: 0.08,
            lines: dailyLines
        ),
        ReadingItem(
            id: "panth-prakash",
            title: "Panth Prakash",
            subtitle: "Episodes, volumes, and editorial bridges",
            category: "Library",
            source: "Panthic Library",
            progress: 0.28,
            lines: dailyLines
        ),
        ReadingItem(
            id: "rehat-maryada",
            title: "Rehat Maryada",
            subtitle: "Structured sections with reading progress",
            category: "Rehat",
            source: "SGPC",
            progress: 0,
            lines: dailyLines
        ),
        ReadingItem(
            id: "scripture-search",
            title: "Scripture Search",
            subtitle: "Search-ready route for BaniDB-backed scripture lookup",
            category: "Search",
            source: "BaniDB v2",
            progress: 0,
            lines: dailyLines
        )
    ]

    static let learnItems: [LearnItem] = [
        LearnItem(id: "topic-anxiety", title: "When worry must remember who is carrying the breath", category: "Topic", summary: "A guided reflection for returning worry to Hukam."),
        LearnItem(id: "daily-guidance", title: "Begin under the Name before anything else", category: "Daily Guidance", summary: "A short practice for beginning the day without scattering."),
        LearnItem(id: "shabad-deep-dive", title: "Read one shabad with source, raag, and meaning", category: "Shabad", summary: "A compact study path that keeps the original line central."),
        LearnItem(id: "collection-evening", title: "Evening steadiness collection", category: "Collection", summary: "A saved sequence of Rehras, reflection, and vocab review."),
        LearnItem(id: "vocab-review", title: "Review saved words", category: "Vocab", summary: "Bring saved words back at a steady review pace.")
    ]
}

private struct NativeCatalogPayload: Decodable {
    var readings: [NativeCatalogReading]
    var learnItems: [LearnItem]
}

private struct NativeCatalogReading: Decodable {
    var id: String
    var title: String
    var subtitle: String
    var category: String
    var source: String
    var progress: Double

    func item(sampleLines: [ReadingLine]) -> ReadingItem {
        ReadingItem(
            id: id,
            title: title,
            subtitle: subtitle,
            category: category,
            source: source,
            progress: progress,
            lines: sampleLines
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
        let items = payload?.readings.map { $0.item(sampleLines: NativeFixtures.dailyLines) } ?? []
        return items.isEmpty ? NativeFixtures.readings : items
    }

    static var learnItems: [LearnItem] {
        let items = payload?.learnItems ?? []
        return items.isEmpty ? NativeFixtures.learnItems : items
    }
}
