// A one-return hint for the current app session, never a reading preference.
let returnOptionId: string | null = null

export function rememberHomeNitnemReturn(optionId: string): void {
  returnOptionId = optionId
}

export function getHomeNitnemReturn(): string | null {
  return returnOptionId
}

export function clearHomeNitnemReturn(expectedId?: string | null): void {
  if (expectedId === undefined || returnOptionId === expectedId) returnOptionId = null
}
