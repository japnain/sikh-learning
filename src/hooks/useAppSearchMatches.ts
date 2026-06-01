import {
  getAppSearchMatches,
  type AppSearchMatch,
  type SearchSource,
} from "../utils/appSearch"

export default function useAppSearchMatches(query: string, searchSource: SearchSource = "all") {
  return getAppSearchMatches(query, searchSource) as AppSearchMatch[]
}
