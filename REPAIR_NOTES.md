# ClaimClear repair notes

## Changes made

- Repaired the upload flow with file type/size and signature checks, owner-scoped document retrieval, safer extraction parsing, bounded provider calls, and visible processing errors. Failed extractions can be retried against the existing sample upload; unreferenced uploads are cleaned up when case creation fails.
- Fixed case review and follow-up persistence issues, question sequencing, date/length validation, retry/resume paths, and routing for cases whose letter is still being drafted.
- Hardened auth hydration and signup behavior, added confirmation-email feedback, and routed authenticated users to the dashboard rather than an empty auth screen.
- Hardened PayPal sandbox checkout/capture with owner and order checks, exact amount/currency verification, safe idempotent handling, and explicit sandbox/no-real-charge disclosures.
- Restricted letter generation to paid cases on the server, guarded prompt content against unsupported facts, legal claims, deadlines, and invented attachments, and kept draft/approval disclaimers visible.
- Added a forward Supabase migration restricting client case inserts and corrected the review form to update only fields granted to authenticated users.
- Removed unsupported privacy, human-review, and speed claims; added sample-data-only and non-advice disclosures; corrected starter metadata/favicon; and split screen bundles so the initial JS chunk is smaller.

## Verification

- `npm run typecheck` — passed.
- `npm run lint` — passed with no ESLint errors. The installed TypeScript version (5.6.3) is outside the older parser's declared range; the parser prints a compatibility warning.
- `npm run build` — passed. Browserslist prints an advisory that its local compatibility database is stale.
- Supabase Edge Function TypeScript syntax — parsed locally with esbuild.
- Route manifest and favicon reference — checked.

## Not verified

No external Supabase, Gemini, or PayPal calls were made. The migration was not applied, Edge Functions were not deployed, and the remote deployment/database state was not verified. This archive excludes the uploaded `.env`; copy `.env.example` and configure your own values before running.
