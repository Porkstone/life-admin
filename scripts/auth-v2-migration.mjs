// Pure migration logic, separate from deployment I/O for regression testing.
export function buildEmailMigration({ users, accounts, existing, completed }) {
  const normalize = (email) => email.trim().toLowerCase().normalize("NFC");
  const done = new Set(completed.map((row) => row.userId));
  const eligible = users.filter((user) => !user.isAnonymous && user.email &&
    accounts.some((account) => account.userId === user._id &&
      (account.provider === "password" || (account.provider === "magic-link" && account.emailVerified))));
  const owners = new Map();
  for (const user of eligible) {
    const email = normalize(user.email);
    if (owners.has(email) && owners.get(email) !== user._id) {
      throw new Error("Duplicate legacy emails need manual resolution; no mappings imported.");
    }
    owners.set(email, user._id);
  }
  const additions = [];
  const userIds = [];
  for (const user of eligible) {
    if (done.has(user._id)) continue;
    const email = user.email.trim();
    const normalizedEmail = normalize(email);
    const collision = existing.find((row) => row.normalizedEmail === normalizedEmail && row.userId !== user._id);
    if (collision) throw new Error("A recovery email belongs to another v2 account; no mappings imported.");
    if (!existing.some((row) => row.userId === user._id)) {
      additions.push({ userId: user._id, email, normalizedEmail, isPrimary: true });
    }
    userIds.push(user._id);
  }
  return { additions, userIds };
}
