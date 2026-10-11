# Step 14 — reversible pilot release

Status: local release preparation. **Not deployed; not cleared for real transactions.** Start with the validated PAN six-task, MSME and visiting-card pack journeys. Other supported links remain present; this is not a claim that every service family has passed the full matrix.

## Package contents

Run `npm run release:build` to create a new timestamped directory under `release-packages/`. Nothing is overwritten or deleted. `artifacts/pilot-release-build.json` points to the latest result.

- `pages/`: root website HTML, public assets, built dashboard and routing configuration. Only this folder belongs on GitHub Pages.
- `transaction/`: matching website plus backend source/migrations, server and locked package dependencies. Install production dependencies on the transaction server with `npm ci --omit=dev`; use a compatible Node runtime verified with the existing backend. Never upload this folder to public static hosting.
- `runbooks/`: release, rollback, monitoring and device-check instructions; example server/nginx settings.
- `manifest.json`: paths, SHA-256 hashes and sizes for package files; excluded runtime material and pending gates.

The package excludes `.env`, runtime databases, customer uploads/invoices, logs, `node_modules` and unrelated user project folders. It is an application-code package, **not a customer-data backup**. It retains old root links. No simulator/test database is included.

Built dashboard paths are exported as lowercase `dashboard/`, matching server/URL paths on case-sensitive Linux hosting. The home keychain image now points to its existing `Personalized Gifts/Keychain` asset; package verification found and repaired the old nonexistent image directory.

By default, `transactionOrigin` stays empty for local review. To build a configured copy later, use `npm run release:build -- --transaction-origin=https://orders.your-domain.com` with the actual trusted HTTPS origin. This updates only generated copies, not working source or live hosting. The builder does not validate that host's DNS/certificates/provider configuration and never marks the release live-ready automatically.

## Before updating the live site

1. Save the currently deployed code/build and configuration as the rollback version; record its release ID and how it starts. Record the actual database, upload and invoice locations. A new release must reuse the existing persistent data paths rather than create an empty database.
2. Complete the physical-device checklist and a configured HTTPS payment-sandbox flow, including cancellation, pending/failure, return from payment app, upload retry, guest/account ownership and existing-order recovery. Do not treat the local simulator as provider sign-off.
3. Make a consistent database backup and copies of customer uploads/invoices using the deployment's existing backup process. For SQLite, an online backup or a stop/checkpoint/consistent-copy procedure is needed; copying a live database without its WAL state is not a verified backup. Verify the backup can be restored in a separate staging environment. Keep backups private and outside the application release directory.
4. Apply new backend code in a separate release directory. Keep server secrets private. Confirm database location, trusted HTTPS site URL, gateway callback/webhook URLs, domain allowlist, storage permissions and operational admin access. Migrations run during database initialization; rehearse them against a staging copy first and record results.

   The current uploader writes to `backend/uploads/customer-documents` and saved file paths can be absolute. Mount/link the new code's upload directory to the persistent location using the host's established mechanism, and keep older saved paths accessible. Preserve invoice directories too. Rehearse this in staging; changing `DATABASE_URL` alone does not relocate uploads or rewrite stored paths.
5. Start the new version in staging and check health/catalog/CSRF plus an order through verification/invoice/documents/tracking. Check previously created unpaid/paid orders and original service/detail URLs. Preserve applicant snapshots and persisted files.
6. Switch the transaction server to the new code. After smoke checks pass, publish the matching `pages/` contents to the repository's configured Pages source. Retain the established `/One-Point/` path. Uploading the whole package would expose server code and is incorrect.
7. Verify public PAN/MSME/print entry reaches the configured HTTPS transaction host; no applicant details travel in the URL. Confirm server amounts and ownership, in-progress orders, cancel/reload recovery and browser console errors. Check actual fonts/icons/CDN assets and offline/slow behaviour.
8. Record release ID/time, operator and each smoke-test result. Begin the monitoring log. Use rollback instructions if a stop condition occurs; do not continue collecting broken orders.

This step prepares code/configuration and runbooks locally. Publishing, provider setup, customer migration, physical tests and observed live pilot results remain pending. Step 15 can expand policy coverage after the pilot evidence supports it.
