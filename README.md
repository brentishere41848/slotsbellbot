# Slotsbell Giveaway Bot

This workspace contains Slotsbell, a Discord giveaway bot for Discord servers. It uses slash commands, persistent JSON storage, weighted role bonus entries, invite requirements, required roles, blocked roles, rerolls, and a `/help` command.

## Branding

Set the Discord application name to `Slotsbell` in the Discord Developer Portal. Upload the bell icon there as the bot/application avatar.

If you also want the icon to appear inside Slotsbell embeds, host the image at a public HTTPS URL and set:

```env
SLOTSBELL_ICON_URL=https://example.com/slotsbell-icon.png
```

## Setup

Add these values to your environment or `.env` file:

```powershell
Copy-Item .env.example .env
notepad .env
```

```env
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-application-client-id
DISCORD_GUILD_ID=optional-dev-server-id
GIVEAWAY_STORAGE_PATH=data/giveaways.json
SLOTSBELL_ICON_URL=
```

Invite the bot with these scopes:

```text
bot applications.commands
```

Recommended bot permissions:

```text
View Channels
Send Messages
Embed Links
Read Message History
Use External Emojis
Manage Roles
Manage Server
```

`Manage Server` is required only when giveaways use `required-invites`, because Discord invite uses must be fetched from the guild. `Manage Roles` is required only when `giveaway-winners-role` is used.

## Commands

Register slash commands:

```powershell
pnpm commands:register
```

For Docker, command registration is a one-off command. Run it after filling in `.env` and after building the image:

```bash
sudo docker run --rm --env-file .env slotsbells-bot node dist/register-commands.js
```

If `DISCORD_GUILD_ID` is set, commands register to that server and usually appear immediately. If it is empty, commands register globally and can take up to 1 hour to appear.

Run the bot in development:

```powershell
pnpm dev
```

Build and run:

```powershell
pnpm build
pnpm start
```

## Linux Deployment

On a Linux server with Node.js 22+:

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
nano .env
pnpm build
pnpm commands:register
pnpm start
```

For a production service, copy the project to `/opt/slotsbells-bot`, fill in `/opt/slotsbells-bot/.env`, and use `systemd/slotsbells-bot.service.example` as the systemd service template.

Docker is also supported:

```bash
docker build -t slotsbells-bot .
docker run --rm --env-file .env slotsbells-bot node dist/register-commands.js
docker run --env-file .env -v slotsbells-data:/app/data slotsbells-bot
```

## Giveaway Usage

Create a giveaway:

```text
/giveaway create duration:1d winners:2 prize:Nitro
```

Role bonus entries:

```text
@Administrator 2 @VIP 5
```

This gives users with `@Administrator` 2 extra entries and users with `@VIP` 5 extra entries. Everyone starts with 1 base entry.

Supported duration formats:

```text
1m 1h 1d 1w
```

Useful options:

- `required-role` means users must have that role to enter.
- `blocked-role` means users must not have that role to enter.
- `required-invites` means users need at least that many active invite uses.
- `giveaway-winners-role` gives winners a role when the giveaway ends.
- `giveaway-winners-dm-message` can use `{prize}`.
- `image`, `thumbnail`, `color`, and `end-color` control the giveaway embed.

Manager roles can use every command:

```text
/giveaway manager-roles action:set roles:@Giveaway Manager
```

Creator roles can create giveaways only:

```text
/giveaway creator-roles action:set roles:@Giveaway Creator
```

Server administrators and users with Manage Server can always manage giveaways.
