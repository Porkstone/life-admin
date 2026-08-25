# Agent instructions

## Git workflow

Unless the user explicitly asks otherwise, after completing and verifying requested changes:

1. Review the working tree and include only changes that belong to the user's requested work.
2. Commit those changes to the `master` branch with a concise, descriptive commit message.
3. Push the commit to `origin/master` automatically.

Never commit secrets, generated build output, or unrelated user changes. If committing or pushing is unsafe or blocked by authentication, conflicts, branch protection, or failing verification, stop and explain the blocker instead of forcing the operation.
