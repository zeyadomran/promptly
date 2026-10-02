import type { SearchRequest } from '../../../shared/contracts/domain';
import { libraryFixture } from './library-test-fixture';

/** Holds an actual snapshot response, so later commits cannot rewrite the held revision. */
export function delayedLibraryFixture(count = 1_000) {
  const fixture = libraryFixture(count);
  const search = fixture.bridge.searchSnippets;
  let heldOffset: number | undefined;
  let release: (() => void) | undefined;

  fixture.bridge.searchSnippets = (request: SearchRequest) => {
    const response = search(request);

    if (request.offset !== heldOffset || request.limit !== 200) return response;
    heldOffset = undefined;
    return new Promise((resolve) => {
      release = () => {
        void response.then(resolve);
      };
    });
  };

  return {
    ...fixture,
    holdNext: (offset: number) => {
      heldOffset = offset;
    },
    release: () => {
      if (release === undefined) throw new Error('No held library response.');
      release();
      release = undefined;
    }
  };
}
