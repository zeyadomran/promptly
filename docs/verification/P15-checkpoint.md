# Compact library checkpoint

This is an implementation checkpoint, not acceptance or a ready PR.

- Real IPC search, tag filters, four sorts, fixed 78px virtual rows, count/pin footer,
  escaped exact highlights and nullable metadata are connected to one selection owner.
- Page size is 200; cache holds at most five pages. Selection scans actual pages by
  ID after mutations and exposes null while pending. Copy/tag execution are explicit
  integration ports for issues 19/20, with no claimed success while absent.
- Five focused paging regressions and all three TypeScript projects passed locally.
- Remaining: resolve the TanStack React Hooks compatibility warning without relaxing
  strict lint, merge the final search candidate/main, test delayed/stale response and
  StrictMode lifetime edges, and run owned 10k UI/keyboard/CSP/visual qualification.
- No GUI/native preference/clipboard tests ran for this checkpoint. No owned processes
  remain. The inherited search candidate also has a main-layer Zod architecture issue
  already being corrected by its owner.

New dependency `@tanstack/react-virtual` is exact 3.14.13, verified against npm's
primary registry as latest stable with React 19 peer compatibility. The generated
shadcn DropdownMenu is split into focused component files and uses the existing cn
utility; no incidental cn dependency remains.
