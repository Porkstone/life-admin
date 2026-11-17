# Convex Auth v2 migration and recovery

This migration preserves the existing application `users` rows and their IDs.
People, vehicles, homes, contracts, documents and agent tokens keep their current
owners. Registration is closed; it does not provision additional accounts.

## Deployment configuration

Configure these on **each target Convex deployment** before deploying:

- `RESEND_API_KEY`, or the existing `AUTH_RESEND_KEY`: a direct Resend API key.
  The old Chef `CONVEX_RESEND_API_KEY` proxy is not supported by v2.
- `AUTH_EMAIL_FROM`: a sender accepted by Resend, for example
  `Life Admin <auth@your-verified-domain.example>`.
- `SITE_URL`: the frontend origin, currently `https://life-admin-ui.vercel.app`.
  Recovery emails point to this origin, rather than the Convex HTTP origin.

Resend's onboarding sender can deliver only to the Resend account owner's
address. Use a verified domain for other recipients.

Vercel must run `pnpm run vercel-build`. Create a Convex production deploy key
and set `CONVEX_DEPLOY_KEY` in Vercel. The build deploys the v2 components, runs
the email mapping migration against that exact deployment (using the URL passed
by `convex deploy`), and then builds the frontend.
Keep Vercel pointed at the same Convex project/deployment as the existing data.

For the configured development deployment:

```sh
npm run dev:backend -- --once
npm run migrate:auth-v2
npm run build
```

For an explicit production migration after deploying the backend:

```sh
npm run migrate:auth-v2 -- --prod
```

The migration copies only the existing accounts' recovery email mappings into
the `authEmail` component, keeping their original user IDs. It refuses duplicate
or conflicting emails, skips anonymous accounts, and never copies or displays
password hashes. `authV2Migrations` records completed imports so later builds
cannot restore an obsolete email mapping. The script appends missing mappings
only; rerunning it never replaces a v2 password. Temporary files are outside the
repository and removed when the script exits.

## First sign-in and password recovery

Legacy password hashes are not imported into the new password component.
After migration, the owner must establish a new password:

1. Open the frontend and choose **Forgot your password?**.
2. Enter the existing account's email address.
3. Open the emailed reset link in the same browser and on the same device
   within ten minutes. If the email opens in another browser, copy its link
   into the browser that requested it. Do not forward the link.
4. Enter and confirm a unique password of 10–100 characters.
5. Recovery sets the password, revokes older v2 sessions, and signs the user in.
   Continue to Life Admin and confirm the existing data is present.

This same journey remains available for future forgotten passwords. Invalid,
expired, already used and wrong-browser links explain how to request a new
link. Rejected new passwords can be corrected without consuming a valid link.
Old magic links, v1 sessions and old custom reset links no longer authenticate;
old reset URLs display a link to the new recovery journey.

## Verification and rollback

Before deployment, export a database snapshot outside the repository with
`npx convex export --path <private-backup.zip>`. Keep it private: it includes
personal information and legacy authentication data. No application or storage
rows are deleted by this migration.

Run `npm test`, TypeScript checks for the frontend and backend, ESLint and
`npm run build`. Recovery integration tests use the actual v2 components and a
Resend stub, replacing only the WASM password hash primitive in the Node test
runner. They cover ownership preservation, recovery without an existing v2
password, sign-in, session revocation, link replay, expiry, wrong browser/code,
weak-password retry and unknown addresses. They send no real emails.

After deploying, complete the first-sign-in journey above to confirm actual
Resend delivery and browser behavior. Automated tests cannot prove inbox
delivery or sender-domain configuration.

The original v1 tables remain inert in the schema for rollback. Do not remove
them until the new journey has been verified. Keep the old `JWT_PRIVATE_KEY`
and `JWKS` deployment variables until then; v2 does not use them. To roll back,
deploy the previous application revision with its original dependencies and
frontend. Any password established in v2 does not update the retained v1 hash;
the old password applies again after rollback. Do not replace the whole live
database with an old snapshot after new application records have been added.
