import { getNaamrasInsforgeClient } from './client'
import { getNaamrasInsforgeConfig } from './config'
import type { GenerateStudyRequest, GenerateStudyResponse } from './types'

export async function generateStudyResponse(request: GenerateStudyRequest) {
  const client = getNaamrasInsforgeClient()
  const config = getNaamrasInsforgeConfig()

  if (!client || !config.enabled) {
    return {
      data: null,
      error: new Error('InsForge is not configured for this build.'),
    }
  }

  if (!config.studyEnabled) {
    return {
      data: null,
      error: new Error('AI study tools are disabled for this rollout.'),
    }
  }

  const { data: authData, error: authError } = await client.auth.getCurrentUser()
  if (authError || !authData?.user) {
    return {
      data: null,
      error: authError ?? new Error('Sign in is required to use AI study tools.'),
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
