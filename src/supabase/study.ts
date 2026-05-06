import { getNaamrasSupabaseClient } from './client'
import { getNaamrasSupabaseConfig } from './config'
import type { GenerateStudyRequest, GenerateStudyResponse } from './types'

export async function generateStudyResponse(request: GenerateStudyRequest) {
  const client = getNaamrasSupabaseClient()
  const config = getNaamrasSupabaseConfig()

  if (!client || !config.enabled) {
    return {
      data: null,
      error: new Error('Supabase is not configured for this build.'),
    }
  }

  if (!config.studyEnabled) {
    return {
      data: null,
      error: new Error('AI study tools are disabled for this rollout.'),
    }
  }

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData?.user) {
    return {
      data: null,
      error: userError ?? new Error('Sign in is required to use AI study tools.'),
    }
  }

  const response = await client.functions.invoke<GenerateStudyResponse>(config.studyFunctionSlug, {
    body: request,
  })

  if (response.error) {
    return {
      data: null,
      error: response.error,
    }
  }

  return {
    data: response.data ?? null,
    error: null,
  }
}
