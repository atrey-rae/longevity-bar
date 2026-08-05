# State

- Status: local implementation and independent root review complete; awaits migration, env and deploy
- Remote DB migration: not run
- Production deploy: not run
- Required production env: `BAR_AUTH_PEPPER`, `OPTIMCALL_TOKEN`,
  `OPTIMCALL_DEVICE_ID`, `OPTIMCALL_TENANT_HOST`, optional `OPTIMCALL_USER`,
  existing `RESEND_API_KEY` and `RESEND_FROM`
- Read-only production preflight: GREEN on 2026-08-04; no duplicate or invalid
  legacy phone was found. Re-run immediately before migration if profiles have
  changed.
