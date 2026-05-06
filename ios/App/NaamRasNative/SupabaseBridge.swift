import AuthenticationServices
import CryptoKit
import Foundation
import Security

#if canImport(Supabase)
import Supabase
#endif

struct SupabaseConfiguration: Equatable {
    var url: URL?
    var anonKey: String?

    var isConfigured: Bool {
        url != nil && !(anonKey ?? "").isEmpty
    }

    var functionsBaseURL: URL? {
        guard let url else { return nil }
        let hostParts = url.host()?.split(separator: ".")
        guard let projectRef = hostParts?.first else { return nil }
        return URL(string: "https://\(projectRef).functions.supabase.co")
    }

    static func fromBundle() -> SupabaseConfiguration {
        let info = Bundle.main.infoDictionary ?? [:]
        let rawURL = (info["SUPABASE_URL"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let rawKey = (info["SUPABASE_ANON_KEY"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let url = rawURL.flatMap { value in
            value.isEmpty || value.hasPrefix("$(") ? nil : URL(string: value)
        }
        let key = rawKey.flatMap { value in
            value.isEmpty || value.hasPrefix("$(") ? nil : value
        }
        return SupabaseConfiguration(url: url, anonKey: key)
    }
}

enum SupabaseBridgeError: LocalizedError {
    case notConfigured
    case missingAppleToken
    case unsupportedCredential
    case sdkUnavailable
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .notConfigured: "Supabase URL and anon key are not configured for this build."
        case .missingAppleToken: "Apple did not return an identity token."
        case .unsupportedCredential: "The Apple authorization result did not contain an Apple ID credential."
        case .sdkUnavailable: "Supabase Swift is not linked into this target."
        case .invalidResponse: "Supabase returned an unexpected response."
        }
    }
}

final class SupabaseBridge {
    let configuration: SupabaseConfiguration

    #if canImport(Supabase)
    private let client: SupabaseClient?
    #endif

    init(configuration: SupabaseConfiguration = .fromBundle()) {
        self.configuration = configuration
        #if canImport(Supabase)
        if let url = configuration.url, let anonKey = configuration.anonKey {
            client = SupabaseClient(supabaseURL: url, supabaseKey: anonKey)
        } else {
            client = nil
        }
        #endif
    }

    static func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remainingLength = length

        while remainingLength > 0 {
            var random: UInt8 = 0
            let status = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
            if status == errSecSuccess && Int(random) < charset.count {
                result.append(charset[Int(random)])
                remainingLength -= 1
            }
        }

        return result
    }

    static func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        return hashedData.map { String(format: "%02x", $0) }.joined()
    }

    func signInWithApple(authorization: ASAuthorization, nonce: String) async throws -> CloudUser {
        guard configuration.isConfigured else { throw SupabaseBridgeError.notConfigured }
        guard let appleCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            throw SupabaseBridgeError.unsupportedCredential
        }
        guard let identityToken = appleCredential.identityToken,
              let idToken = String(data: identityToken, encoding: .utf8) else {
            throw SupabaseBridgeError.missingAppleToken
        }

        #if canImport(Supabase)
        guard let client else { throw SupabaseBridgeError.notConfigured }
        _ = try await client.auth.signInWithIdToken(
            credentials: OpenIDConnectCredentials(
                provider: .apple,
                idToken: idToken,
                nonce: nonce
            )
        )
        #else
        throw SupabaseBridgeError.sdkUnavailable
        #endif

        return CloudUser(
            id: appleCredential.user,
            email: appleCredential.email ?? "Apple ID"
        )
    }

    func sendMagicLink(email: String) async throws {
        guard configuration.isConfigured else { throw SupabaseBridgeError.notConfigured }
        #if canImport(Supabase)
        guard let client else { throw SupabaseBridgeError.notConfigured }
        try await client.auth.signInWithOTP(email: email)
        #else
        throw SupabaseBridgeError.sdkUnavailable
        #endif
    }

    func invokeMerge(snapshot: NativeSnapshot) async throws -> Date {
        guard configuration.isConfigured,
              let functionsBaseURL = configuration.functionsBaseURL,
              let anonKey = configuration.anonKey else {
            throw SupabaseBridgeError.notConfigured
        }

        let accessToken: String
        #if canImport(Supabase)
        guard let client else { throw SupabaseBridgeError.notConfigured }
        accessToken = try await client.auth.session.accessToken
        #else
        throw SupabaseBridgeError.sdkUnavailable
        #endif

        var request = URLRequest(url: functionsBaseURL.appending(path: "merge-local-state"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "authorization")
        request.httpBody = try JSONEncoder.nativeSyncEncoder.encode(["snapshot": snapshot])

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw SupabaseBridgeError.invalidResponse
        }

        return Date()
    }
}

extension JSONEncoder {
    static var nativeSyncEncoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }
}

extension JSONDecoder {
    static var nativeSyncDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
