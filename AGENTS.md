# Slotsbell Giveaway Bot Notes

This app is Slotsbell, a real Discord giveaway bot workspace, not a UI mock or seed-only demo.

## Rules

- Every visible slash command must perform a real action or return a clear error.
- Giveaway state must persist across restarts.
- Giveaway entry requirements must be enforced when users click the enter button.
- Invite requirements depend on Discord guild invites and require the bot to have Manage Server permission.
- Role winner rewards require the bot role to be higher than the target winner role.
- Keep command options stable and avoid beta Discord APIs or experimental packages.

## Verification

After changing the bot, run:

```powershell
pnpm test
pnpm typecheck
pnpm build
```
