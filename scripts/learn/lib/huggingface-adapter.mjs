export function createHuggingFaceAdapter(options = {}) {
  const apiKey = options.apiKey
    ?? process.env.HUGGING_FACE_TOKEN
    ?? process.env.HF_TOKEN
    ?? null
  const textGenerationUrl = options.textGenerationUrl ?? process.env.HF_TEXT_GENERATION_URL ?? null
  const embeddingUrl = options.embeddingUrl ?? process.env.HF_EMBEDDING_URL ?? null

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Hugging Face request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  return {
    enabled: Boolean(apiKey && (textGenerationUrl || embeddingUrl)),
    async generate(prompt, extra = {}) {
      if (!apiKey || !textGenerationUrl) return null
      return postJson(textGenerationUrl, {
        inputs: prompt,
        ...extra,
      })
    },
    async embed(texts) {
      if (!apiKey || !embeddingUrl || texts.length === 0) return null
      return postJson(embeddingUrl, {
        inputs: texts,
      })
    },
  }
}
