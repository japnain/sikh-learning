# Accounts and Golden Court onboarding — 12 November 2026

## Scope

The backend/audio/security changes from the other working copy are already present on master. Comparing both tracked trees found no pending backend implementation to merge. This update adds web email/password accounts, Google provider support, dedicated authentication return and recovery routes, and a Golden Court Assembly welcome screen. The existing two reading-preference screens remain available from More.

## Production configuration

- Supabase email authentication and new signups are enabled; email confirmation remains required.
- Custom Resend SMTP is configured for `login@auth.naamras.xyz`.
- Added exact `/auth/callback` and `/auth/recovery` redirect URLs for `https://naamras.xyz`, `https://www.naamras.xyz`, `http://localhost:5173`, and `http://localhost:4173`. Existing `/more` redirects remain valid for emails already sent. No wildcard redirect was introduced.
- Email/password signup, password sign-in, email-link sign-in, and password recovery use the Supabase Auth SDK. Passwords are never written into application stores, logs, backup files, or repository configuration.
- New passwords require 12–128 characters, with uppercase, lowercase, a digit, and a symbol. Existing sign-in passwords are not rejected by the new client policy. Backend validation remains authoritative.
- Provider settings are discovered from the public Auth settings endpoint. Disabled providers are hidden, and unavailable discovery can be retried. Google and Apple handlers use Supabase's OAuth flow and its fixed callback route.
- Authentication callback errors are displayed as generic, localized messages. Recovery requires a session; Supabase enforces recovery authorization and the existing secure password-change policy. Authentication fragments are removed after processing.

## Provider activation still required

Both Google and Apple are disabled in the production dashboard, with empty client-ID and secret fields. The app implementation cannot make these providers operational without credentials owned by the project.

Google:
1. In Google Auth Platform, configure the NaamRas consent screen and an OAuth web client.
2. Authorized JavaScript origin: `https://naamras.xyz` (and `https://www.naamras.xyz` if used).
3. Authorized redirect URI: `https://nsewywsansbnbbolsgba.supabase.co/auth/v1/callback`.
4. Enter the client ID and secret directly in Supabase Authentication → Sign In / Providers → Google and enable it. Keep nonce checking enabled.
5. Ensure the consent screen permits the intended audience; test the actual consent, cancel, return, and sign-out flow before announcing availability.

Apple:
1. An Apple Developer account and a primary App ID with Sign in with Apple are required.
2. Create/configure a Services ID for the web flow, using `nsewywsansbnbbolsgba.supabase.co` as the domain and the same Supabase `/auth/v1/callback` return URL.
3. Generate the Sign in with Apple key/client secret in the owner’s account. Enter the web Services ID first in Supabase's Client IDs and the generated secret directly in its Apple provider configuration.
4. Renew the web OAuth secret before its six-month expiration and verify Apple's private-email relay with the project's authenticated sender.
5. Test real Apple consent, cancellation, account return, and account-deletion revocation before native release.

Secrets must remain in provider/backend configuration. Do not commit or paste them into source code, reports, or chat.

## Release limits

- Google and Apple cannot be called live until the provider setup above is completed. Their disabled state is not presented as a working sign-in option.
- The existing Capacitor authentication gate remains: native callback/session integration and physical-device tests are a separate release requirement. “Email/password account” here refers to NaamRas's own account flow on the web.
- Leaked-password checking requires Supabase Pro and is unavailable on the current Free plan. Existing confirmation, secure email change, secure password change, and current-password protection remain enabled.
- Cloud backup coverage is unchanged and explicitly described in More. An account does not imply that every device preference is synced.

## Verification

- Focused auth, onboarding, More, app-shell, recovery, and provider tests passed before preview.
- Production build and startup budget passed; Supabase remains outside the eager startup graph.
- A disposable account was created through the production signup endpoint. Confirmation email arrived from the configured sender, and password sign-in accepted the correct password and rejected an incorrect one.
- Further UI/CI and cleanup results are recorded with the final release verification.
