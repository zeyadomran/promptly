# P01 dependency compatibility

Verified against npm `dist-tags.latest`, engines, and peer metadata on 2026-10-02.
Direct dependencies use current stable npm releases with exact versions and a
committed lockfile. TypeScript 6.0.3 is the user-approved compatibility exception
for strict ESLint; current TypeScript 7.0.2 is outside typescript-eslint's peer range.
No prerelease versions or peer dependency override flags are used.

| Dependency                              | Version |
| --------------------------------------- | ------- |
| Electron                                | 44.5.1  |
| Forge CLI, Vite plugin, shared types    | 8.0.1   |
| React, React DOM, React/React DOM types | 19.3.0  |
| TypeScript                              | 6.0.3   |
| Vite                                    | 8.3.2   |
| Tailwind CSS, Tailwind Vite plugin      | 4.3.3   |
| ESLint                                  | 10.11.0 |
| ESLint JS rules                         | 10.0.1  |
| typescript-eslint                       | 8.71.0  |
| Stylistic ESLint plugin                 | 5.10.0  |
| ESLint Prettier config                  | 10.1.8  |
| Simple import sort                      | 14.0.0  |
| React hooks ESLint plugin               | 7.1.1   |
| ESLint globals                          | 17.13.0 |
| Oxc parser                              | 0.152.0 |
| Prettier                                | 3.9.9   |
| Vitest                                  | 5.0.3   |
| Playwright Test                         | 1.63.0  |
| React Testing Library                   | 16.3.3  |
| Testing Library DOM                     | 10.4.2  |
| Testing Library jest-dom                | 7.0.1   |
| jsdom                                   | 30.1.1  |
| Node types                              | 26.6.4  |

Node 22.23.2 satisfies the selected engines: Electron >=22.12, Forge >=22.13,
Vite >=22.12 on Node 22, Vitest >=22.12 on Node 22, and jsdom >=22.22.2 on Node 22.
Node types follow the user's latest-package requirement; runtime APIs still need to
be checked against the documented Node/Electron baseline when used. Application
code currently uses longstanding path/lifecycle APIs.

Latest typescript-eslint 8.71.0 declares TypeScript `>=4.8.4 <6.1.0`, so it cannot
support latest TypeScript 7.0.2. TypeScript 6.0.3 is the latest compatible stable
release. ESLint uses Carbon's strict/stylistic typed rules, project service, naming,
boolean expressions, exhaustiveness, import sorting, and declaration/control-flow
spacing; React hooks rules also apply. Prettier uses single quotes, 100 columns,
and no trailing commas. Oxc independently parses TSX for the tested architecture
gate. Vite's built-in TSX transform avoids an unnecessary React plugin and its
optional React compiler peers. Latest jsx-a11y 6.10.2 supports only ESLint through 9,
so it is omitted rather than overriding its peer range; full accessibility audit
remains P27.

The [Forge Vite plugin](https://www.electronforge.io/config/plugins/vite) is still
described as experimental in its official documentation. Forge 8's installed source
uses Vite 8's Rolldown bundling options. Production and preload entries use `.cjs`
to work under the ESM package configuration; the preload is a single bundle because
[sandboxed preloads](https://www.electronjs.org/docs/latest/tutorial/sandbox) have a
restricted CommonJS environment. Native dependencies are not introduced by P01.

Official references:

- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron sandbox and preload restrictions](https://www.electronjs.org/docs/latest/tutorial/sandbox)
- [Vite JSX support](https://vite.dev/guide/features.html#jsx)
- [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite)
- [Oxc parser](https://oxc.rs/docs/guide/usage/parser.html)

Recheck metadata with `npm view <package> version engines peerDependencies --json`.
Use `npm ci` to reproduce this snapshot; new releases need a new lockfile and checks.
