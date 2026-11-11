import { loadEnv } from 'vite'

// ios:sync uses the default Vite production mode, including ignored local files
// and shell overrides. Audit that same configuration rather than one env file.
export function getAppStoreEnvironmentChecks(root) {
  const env = loadEnv('production', root, 'VITE_')
  const allowed = new Set(['VITE_SUPPORT_URL', 'VITE_PRIVACY_URL'])
  const unexpected = Object.entries(env)
    .filter(([key, value]) => value.trim() && !allowed.has(key))
    .map(([key]) => key)
    .sort()

  return [
    {
      ok: env.VITE_SUPPORT_URL === 'https://naamras.xyz/support',
      message: 'native production support URL is public and valid',
    },
    {
      ok: env.VITE_PRIVACY_URL === 'https://naamras.xyz/privacy',
      message: 'native production privacy URL is public and valid',
    },
    {
      ok: unexpected.length === 0,
      message: 'native production environment retains the reviewed local-only configuration',
      // Report names only: neither credentials nor endpoint values belong in logs.
      detail: unexpected.length
        ? `Unexpected variables: ${unexpected.join(', ')}. Web backend activation does not authorize native release; finish native authentication callbacks and re-review App Privacy before changing this gate.`
        : '',
    },
  ]
}
