import type { SearchRequest } from '../../shared/contracts/domain';
import { foldText } from '../../shared/search/match-text';
import { parseQuery } from '../../shared/search/parse-query';
import type { SearchEntry } from './search-snapshot';

export function compileSearchFilter(request: Pick<SearchRequest, 'query' | 'tagIds' | 'untagged'>) {
  const parsed = parseQuery(request.query);
  const text = parsed.text.map(foldText);
  const requirements: ((entry: SearchEntry) => boolean)[] = [];

  if (request.untagged) requirements.push((entry) => entry.tagIds.size === 0);
  for (const id of request.tagIds) requirements.push((entry) => entry.tagIds.has(id));
  for (const name of parsed.tags.map(foldText))
    requirements.push((entry) => entry.tagNames.has(name));
  for (const source of parsed.sources.map(foldText))
    requirements.push((entry) => entry.sources.some((value) => value.includes(source)));
  for (const term of text) requirements.push((entry) => entry.text.includes(term));

  return {
    text,
    matches(entry: SearchEntry): boolean {
      if (entry.snippet.text.trim() === '' && (parsed.text.length > 0 || parsed.sources.length > 0))
        return false;
      for (const requirement of requirements) if (!requirement(entry)) return false;
      return true;
    }
  };
}
