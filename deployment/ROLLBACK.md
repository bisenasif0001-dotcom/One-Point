# Pilot rollback runbook

Prepare the previous deployment, startup instructions and consistent private data backup **before** switching versions. The new local package does not contain the previous live build or customer backup.

Stop rollout for a wrong selected service/amount, duplicate charge/order, loss of uploaded bytes, unauthorized order access, paid state shown without verification, unusable primary mobile action or sustained booking failures. Record the affected release and time; preserve payment references privately for reconciliation.

1. Pause new transactions using the existing hosting maintenance mechanism. Public discovery/support can remain available. Clearing `transactionOrigin` alone does not safely disable backend payments and does not make GitHub Pages transactional.
2. Preserve logs and a consistent snapshot of **current** data/files, including orders received after deployment. Do not overwrite them with the pre-release backup.
3. Revert public `pages/` to the retained previous static build and routing configuration. Revert the transaction process to the retained previous code/environment. Verify that previous code is compatible with the current migrated schema in staging first; additive migrations are not proof of compatibility.
4. Prefer a code rollback that keeps current customer data. If old code cannot use the migrated schema, keep transactions paused and prepare a tested forward repair or staged restore/reconciliation. Never restore an old database blindly: it would lose newer orders/payments and disconnect uploaded files.
5. Reconcile any gateway captures/webhooks that arrived while the app was unavailable. Preserve stable existing order/payment IDs; do not ask customers to repay a captured payment.
6. Check existing order status, ownership, invoices, private files and old service URLs before reopening. Run the same smoke checklist as the release. Record restart time and verification outcomes in the monitoring log.

Database downgrade commands and process-manager commands are intentionally not guessed: execute the documented procedure for the actual hosting/database/process setup after staging rehearsal. A successful local application-package smoke test is not a database restore rehearsal.
