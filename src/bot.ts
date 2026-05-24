import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Guild,
  GuildMember,
  Interaction,
  Message,
  PermissionFlagsBits,
  userMention
} from "discord.js";
import { brandAuthor, slotsbellBrand } from "./brand";
import { commandJson, type RoleConfigAction } from "./commands";
import { parseDuration, formatDiscordTimestamp } from "./duration";
import { checkEligibility, createEntrant, selectWeightedWinners } from "./giveaway";
import { formatRoleList, parseRoleBonuses, parseRoleIds } from "./roles";
import { JsonGiveawayStorage } from "./storage";
import type { BotConfig } from "./config";
import type { GiveawayRecord, GuildSettings } from "./types";

const activeButtonId = "giveaway:enter";
const participantsButtonId = "giveaway:participants";

function parseHexColor(input: string | null): number | undefined {
  if (!input) {
    return undefined;
  }

  const normalized = input.trim().replace(/^#/, "");
  if (!/^[\da-f]{6}$/i.test(normalized)) {
    throw new Error("Color must be a hex value like #5865F2.");
  }

  return Number.parseInt(normalized, 16);
}

function parseUserIds(input: string | null): string[] {
  if (!input?.trim()) {
    return [];
  }

  return [...new Set([...input.matchAll(/<@!?(\d+)>|(\d{15,25})/g)]
    .map((match) => match[1] ?? match[2])
    .filter((userId): userId is string => Boolean(userId)))];
}

function getMemberRoleIds(member: GuildMember): string[] {
  return member.roles.cache.map((role) => role.id);
}

function hasAnyRole(member: GuildMember, roleIds: string[]): boolean {
  if (roleIds.length === 0) {
    return false;
  }

  const roles = member.roles.cache;
  return roleIds.some((roleId) => roles.has(roleId));
}

function hasServerAdmin(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild);
}

async function canManageGiveaways(storage: JsonGiveawayStorage, member: GuildMember): Promise<boolean> {
  const settings = await storage.getGuildSettings(member.guild.id);
  return hasServerAdmin(member) || hasAnyRole(member, settings.managerRoleIds);
}

async function canCreateGiveaways(storage: JsonGiveawayStorage, member: GuildMember): Promise<boolean> {
  const settings = await storage.getGuildSettings(member.guild.id);
  return hasServerAdmin(member) || hasAnyRole(member, settings.managerRoleIds) || hasAnyRole(member, settings.creatorRoleIds);
}

async function requireManager(interaction: ChatInputCommandInteraction, storage: JsonGiveawayStorage): Promise<GuildMember | undefined> {
  if (!interaction.inCachedGuild() || !(interaction.member instanceof GuildMember)) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return undefined;
  }

  if (!(await canManageGiveaways(storage, interaction.member))) {
    await interaction.reply({ content: "You do not have permission to manage giveaways.", ephemeral: true });
    return undefined;
  }

  return interaction.member;
}

async function requireCreator(interaction: ChatInputCommandInteraction, storage: JsonGiveawayStorage): Promise<GuildMember | undefined> {
  if (!interaction.inCachedGuild() || !(interaction.member instanceof GuildMember)) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return undefined;
  }

  if (!(await canCreateGiveaways(storage, interaction.member))) {
    await interaction.reply({ content: "You do not have permission to create giveaways.", ephemeral: true });
    return undefined;
  }

  return interaction.member;
}

async function getInviteCount(guild: Guild, userId: string): Promise<number> {
  const invites = await guild.invites.fetch();
  return invites.reduce((total, invite) => {
    if (invite.inviter?.id !== userId) {
      return total;
    }

    return total + (invite.uses ?? 0);
  }, 0);
}

function buildGiveawayEmbed(giveaway: GiveawayRecord): EmbedBuilder {
  const endsAt = new Date(giveaway.endsAt);
  const active = giveaway.status === "active";
  const lines = [
    "Click 🎉 button to enter!",
    `Winners: **${giveaway.winnerCount}**`,
    active ? `Ends: ${formatDiscordTimestamp(endsAt, "R")} (Timer)` : `Ended: ${formatDiscordTimestamp(endsAt, "R")}`,
    "",
    `Hosted by: ${userMention(giveaway.hostId)}`
  ];

  if (giveaway.requirements.requiredInvites) {
    lines.push("", "Must have sent:", `• **${giveaway.requirements.requiredInvites}** invites`);
  }

  if (giveaway.requirements.requiredRoleId) {
    lines.push("", `Must have the role: <@&${giveaway.requirements.requiredRoleId}>`);
  }

  if (giveaway.requirements.blockedRoleId) {
    lines.push(`Must not have the role: <@&${giveaway.requirements.blockedRoleId}>`);
  }

  if (giveaway.roleBonuses.length > 0) {
    lines.push("", "Roles with bonus entries:");
    for (const bonus of giveaway.roleBonuses) {
      lines.push(`• <@&${bonus.roleId}> - **${bonus.entries}** bonus ${bonus.entries === 1 ? "entry" : "entries"}`);
    }
  }

  if (giveaway.winnerIds.length > 0) {
    lines.push("", `Winners: ${giveaway.winnerIds.map((winnerId) => userMention(winnerId)).join(", ")}`);
  }

  lines.push("", `Ends at • ${formatDiscordTimestamp(endsAt, "f")}`);

  const embed = new EmbedBuilder()
    .setTitle(giveaway.prize)
    .setDescription(lines.join("\n"))
    .setColor(active ? giveaway.color ?? slotsbellBrand.color : giveaway.endColor ?? 0x57f287)
    .setFooter({
      text: `${Object.keys(giveaway.entrants).length} participants • ${Object.values(giveaway.entrants).reduce((total, entrant) => total + entrant.totalEntries, 0)} entries`
    })
    .setTimestamp(endsAt);

  if (giveaway.imageUrl) {
    embed.setImage(giveaway.imageUrl);
  }

  if (giveaway.thumbnailUrl) {
    embed.setThumbnail(giveaway.thumbnailUrl);
  }

  return embed;
}

function buildGiveawayButtons(giveaway: GiveawayRecord): ActionRowBuilder<ButtonBuilder> {
  const participantCount = Object.keys(giveaway.entrants).length;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(activeButtonId)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🎉")
      .setLabel(String(participantCount))
      .setDisabled(giveaway.status !== "active"),
    new ButtonBuilder()
      .setCustomId(participantsButtonId)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("👥")
      .setLabel("Participants")
  );
}

async function fetchGiveawayMessage(client: Client, giveaway: GiveawayRecord): Promise<Message> {
  const channel = await client.channels.fetch(giveaway.channelId);
  if (!channel || !("messages" in channel)) {
    throw new Error("Giveaway channel was not found.");
  }

  return channel.messages.fetch(giveaway.messageId);
}

async function updateGiveawayMessage(client: Client, giveaway: GiveawayRecord): Promise<void> {
  const message = await fetchGiveawayMessage(client, giveaway);
  await message.edit({
    embeds: [buildGiveawayEmbed(giveaway)],
    components: [buildGiveawayButtons(giveaway)]
  });
}

async function announceWinners(client: Client, giveaway: GiveawayRecord, winners: string[], reroll = false): Promise<void> {
  const message = await fetchGiveawayMessage(client, giveaway);
  const winnerText = winners.length > 0 ? winners.map((winnerId) => userMention(winnerId)).join(", ") : "No valid winners";
  await message.reply(`${reroll ? "Rerolled winner" : "Giveaway ended"} for **${giveaway.prize}**: ${winnerText}`);

  if (giveaway.winnerRoleId && winners.length > 0) {
    const guild = await client.guilds.fetch(giveaway.guildId);
    for (const winnerId of winners) {
      const member = await guild.members.fetch(winnerId).catch(() => null);
      if (member) {
        await member.roles.add(giveaway.winnerRoleId).catch(() => undefined);
      }
    }
  }

  if (giveaway.winnersDmMessage && winners.length > 0) {
    for (const winnerId of winners) {
      const user = await client.users.fetch(winnerId).catch(() => null);
      await user?.send(giveaway.winnersDmMessage.replaceAll("{prize}", giveaway.prize)).catch(() => undefined);
    }
  }
}

async function endGiveaway(client: Client, storage: JsonGiveawayStorage, messageId: string, reroll = false, winnerCount?: number): Promise<GiveawayRecord> {
  const giveaway = await storage.updateGiveaway(messageId, (current) => {
    const entrants = Object.values(current.entrants);
    const excluded = reroll ? current.previousWinnerIds : [];
    const winners = selectWeightedWinners(entrants, winnerCount ?? current.winnerCount, excluded);

    return {
      ...current,
      status: "ended",
      winnerIds: winners,
      previousWinnerIds: [...new Set([...current.previousWinnerIds, ...winners])]
    };
  });

  await updateGiveawayMessage(client, giveaway);
  await announceWinners(client, giveaway, giveaway.winnerIds, reroll);
  return giveaway;
}

function getGiveawayFields(interaction: ChatInputCommandInteraction, current?: GiveawayRecord): Partial<GiveawayRecord> {
  const duration = interaction.options.getString("duration");
  const winners = interaction.options.getInteger("winners");
  const prize = interaction.options.getString("prize");
  const host = interaction.options.getUser("host");
  const winnerRole = interaction.options.getRole("giveaway-winners-role");
  const createMessage = interaction.options.getString("giveaway-create-message");
  const winnersDmMessage = interaction.options.getString("giveaway-winners-dm-message");
  const imageUrl = interaction.options.getString("image");
  const thumbnailUrl = interaction.options.getString("thumbnail");
  const color = parseHexColor(interaction.options.getString("color"));
  const endColor = parseHexColor(interaction.options.getString("end-color"));
  const requiredRole = interaction.options.getRole("required-role");
  const blockedRole = interaction.options.getRole("blocked-role");
  const requiredInvites = interaction.options.getInteger("required-invites");
  const roleBonusInput = interaction.options.getString("roles-bonus-entries");
  const fields: Partial<GiveawayRecord> = {};

  if (duration) {
    fields.endsAt = new Date(Date.now() + parseDuration(duration)).toISOString();
  }
  if (winners !== null) {
    fields.winnerCount = winners;
  }
  if (prize) {
    fields.prize = prize;
  }
  if (host) {
    fields.hostId = host.id;
  }
  if (winnerRole) {
    fields.winnerRoleId = winnerRole.id;
  }
  if (createMessage !== null) {
    fields.createMessage = createMessage;
  }
  if (winnersDmMessage !== null) {
    fields.winnersDmMessage = winnersDmMessage;
  }
  if (imageUrl !== null) {
    fields.imageUrl = imageUrl;
  }
  if (thumbnailUrl !== null) {
    fields.thumbnailUrl = thumbnailUrl;
  }
  if (color !== undefined) {
    fields.color = color;
  }
  if (endColor !== undefined) {
    fields.endColor = endColor;
  }
  if (roleBonusInput !== null) {
    fields.roleBonuses = parseRoleBonuses(roleBonusInput);
  }

  const requirements = { ...(current?.requirements ?? {}) };
  if (requiredRole) {
    requirements.requiredRoleId = requiredRole.id;
  }
  if (blockedRole) {
    requirements.blockedRoleId = blockedRole.id;
  }
  if (requiredInvites !== null) {
    if (requiredInvites > 0) {
      requirements.requiredInvites = requiredInvites;
    } else {
      delete requirements.requiredInvites;
    }
  }

  fields.requirements = requirements;
  return fields;
}

async function handleCreate(interaction: ChatInputCommandInteraction, storage: JsonGiveawayStorage): Promise<void> {
  const member = await requireCreator(interaction, storage);
  if (!member || !interaction.guild) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const settings = await storage.getGuildSettings(interaction.guild.id);
  const channel = interaction.options.getChannel("channel") ?? interaction.channel;
  if (!channel || !("send" in channel)) {
    await interaction.editReply("Pick a text channel for the giveaway.");
    return;
  }

  const fields = getGiveawayFields(interaction);
  const now = new Date();
  const giveaway: GiveawayRecord = {
    id: crypto.randomUUID(),
    guildId: interaction.guild.id,
    channelId: channel.id,
    messageId: "pending",
    prize: fields.prize ?? "Giveaway",
    hostId: fields.hostId ?? interaction.user.id,
    winnerCount: fields.winnerCount ?? 1,
    createdAt: now.toISOString(),
    endsAt: fields.endsAt ?? new Date(now.getTime() + 60_000).toISOString(),
    status: "active",
    entrants: {},
    roleBonuses: fields.roleBonuses ?? [],
    requirements: fields.requirements ?? {},
    creatorId: interaction.user.id,
    managerRoleIds: settings.managerRoleIds,
    creatorRoleIds: settings.creatorRoleIds,
    winnerIds: [],
    previousWinnerIds: []
  };

  if (fields.winnerRoleId) {
    giveaway.winnerRoleId = fields.winnerRoleId;
  }
  if (fields.createMessage) {
    giveaway.createMessage = fields.createMessage;
  }
  if (fields.winnersDmMessage) {
    giveaway.winnersDmMessage = fields.winnersDmMessage;
  }
  if (fields.imageUrl) {
    giveaway.imageUrl = fields.imageUrl;
  }
  if (fields.thumbnailUrl) {
    giveaway.thumbnailUrl = fields.thumbnailUrl;
  }
  if (fields.color !== undefined) {
    giveaway.color = fields.color;
  }
  if (fields.endColor !== undefined) {
    giveaway.endColor = fields.endColor;
  }

  const messagePayload = {
    embeds: [buildGiveawayEmbed(giveaway)],
    components: [buildGiveawayButtons(giveaway)]
  };
  const message = await channel.send(giveaway.createMessage ? {
    ...messagePayload,
    content: giveaway.createMessage
  } : messagePayload);
  giveaway.messageId = message.id;
  await storage.upsertGiveaway(giveaway);
  await updateGiveawayMessage(interaction.client, giveaway);
  await interaction.editReply(`Giveaway created in ${channel}. Message ID: \`${message.id}\``);
}

async function handleEdit(interaction: ChatInputCommandInteraction, storage: JsonGiveawayStorage): Promise<void> {
  const member = await requireManager(interaction, storage);
  if (!member) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const messageId = interaction.options.getString("message-id", true);
  const current = await storage.getGiveaway(messageId);
  if (!current) {
    await interaction.editReply("Giveaway was not found.");
    return;
  }

  const fields = getGiveawayFields(interaction, current);
  const giveaway = await storage.updateGiveaway(messageId, (existing) => ({
    ...existing,
    ...fields
  }));
  await updateGiveawayMessage(interaction.client, giveaway);
  await interaction.editReply(`Giveaway \`${messageId}\` was edited.`);
}

async function handleDelete(interaction: ChatInputCommandInteraction, storage: JsonGiveawayStorage): Promise<void> {
  const member = await requireManager(interaction, storage);
  if (!member) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const messageId = interaction.options.getString("message-id", true);
  const giveaway = await storage.getGiveaway(messageId);
  if (!giveaway) {
    await interaction.editReply("Giveaway was not found.");
    return;
  }

  const message = await fetchGiveawayMessage(interaction.client, giveaway).catch(() => null);
  await message?.delete().catch(() => undefined);
  await storage.deleteGiveaway(messageId);
  await interaction.editReply(`Giveaway \`${messageId}\` was deleted.`);
}

async function handleEnd(interaction: ChatInputCommandInteraction, storage: JsonGiveawayStorage): Promise<void> {
  const member = await requireManager(interaction, storage);
  if (!member) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const messageId = interaction.options.getString("message-id", true);
  const giveaway = await storage.getGiveaway(messageId);
  if (!giveaway) {
    await interaction.editReply("Giveaway was not found.");
    return;
  }

  if (giveaway.status === "ended") {
    await updateGiveawayMessage(interaction.client, giveaway);
    await interaction.editReply("That giveaway is already ended. I refreshed the message.");
    return;
  }

  await endGiveaway(interaction.client, storage, messageId);
  await interaction.editReply(`Giveaway \`${messageId}\` was ended.`);
}

async function handleFix(interaction: ChatInputCommandInteraction, storage: JsonGiveawayStorage): Promise<void> {
  const member = await requireManager(interaction, storage);
  if (!member) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const messageId = interaction.options.getString("message-id", true);
  const giveaway = await storage.getGiveaway(messageId);
  if (!giveaway) {
    await interaction.editReply("Giveaway was not found.");
    return;
  }

  if (giveaway.status === "active" && new Date(giveaway.endsAt).getTime() <= Date.now()) {
    await endGiveaway(interaction.client, storage, messageId);
    await interaction.editReply(`Giveaway \`${messageId}\` was overdue and has now ended.`);
    return;
  }

  await updateGiveawayMessage(interaction.client, giveaway);
  await interaction.editReply(`Giveaway \`${messageId}\` was refreshed.`);
}

async function handleReroll(interaction: ChatInputCommandInteraction, storage: JsonGiveawayStorage): Promise<void> {
  const member = await requireManager(interaction, storage);
  if (!member) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const messageId = interaction.options.getString("message-id", true);
  const giveaway = await storage.getGiveaway(messageId);
  if (!giveaway) {
    await interaction.editReply("Giveaway was not found.");
    return;
  }

  const includePrevious = interaction.options.getBoolean("include-previous-winners") ?? false;
  const exclude = parseUserIds(interaction.options.getString("exclude"));
  const winners = selectWeightedWinners(
    Object.values(giveaway.entrants),
    interaction.options.getInteger("winners") ?? giveaway.winnerCount,
    includePrevious ? exclude : [...giveaway.previousWinnerIds, ...exclude]
  );
  const updated = await storage.updateGiveaway(messageId, (current) => ({
    ...current,
    winnerIds: winners,
    previousWinnerIds: [...new Set([...current.previousWinnerIds, ...winners])]
  }));
  await updateGiveawayMessage(interaction.client, updated);
  await announceWinners(interaction.client, updated, winners, true);
  await interaction.editReply(`Giveaway \`${messageId}\` was rerolled.`);
}

function updateRoleSet(current: string[], incoming: string[], action: RoleConfigAction): string[] {
  if (action === "clear") {
    return [];
  }

  if (action === "set") {
    return incoming;
  }

  if (action === "add") {
    return [...new Set([...current, ...incoming])];
  }

  return current.filter((roleId) => !incoming.includes(roleId));
}

async function handleRoleConfig(interaction: ChatInputCommandInteraction, storage: JsonGiveawayStorage, target: "manager" | "creator"): Promise<void> {
  const member = await requireManager(interaction, storage);
  if (!member || !interaction.guild) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const action = interaction.options.getString("action", true) as RoleConfigAction;
  const roles = parseRoleIds(interaction.options.getString("roles"));
  if (action !== "clear" && roles.length === 0) {
    await interaction.editReply("Paste at least one role mention or role ID.");
    return;
  }

  const current = await storage.getGuildSettings(interaction.guild.id);
  const next: GuildSettings = {
    ...current,
    managerRoleIds: target === "manager" ? updateRoleSet(current.managerRoleIds, roles, action) : current.managerRoleIds,
    creatorRoleIds: target === "creator" ? updateRoleSet(current.creatorRoleIds, roles, action) : current.creatorRoleIds
  };
  await storage.setGuildSettings(next);

  const configured = target === "manager" ? next.managerRoleIds : next.creatorRoleIds;
  await interaction.editReply(`${target === "manager" ? "Manager" : "Creator"} roles: ${formatRoleList(configured)}`);
}

async function handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setAuthor(brandAuthor())
    .setTitle("Slotsbell Help")
    .setColor(slotsbellBrand.color)
    .setDescription([
      "**/giveaway create** - Create a giveaway",
      "**/giveaway creator-roles** - Set roles that can create giveaways",
      "**/giveaway delete** - Delete a giveaway",
      "**/giveaway edit** - Edit a giveaway",
      "**/giveaway end** - End a giveaway with the message ID",
      "**/giveaway fix** - Refresh or end an overdue giveaway",
      "**/giveaway manager-roles** - Set roles that can use every command",
      "**/giveaway reroll** - Reroll winners",
      "",
      "Durations use `1m`, `1h`, `1d`, or `1w`.",
      "Role bonuses look like `@Role 2 @VIP 5`."
    ].join("\n"));

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleButton(interaction: ButtonInteraction, storage: JsonGiveawayStorage): Promise<void> {
  const giveaway = await storage.getGiveaway(interaction.message.id);
  if (!giveaway) {
    await interaction.reply({ content: "This giveaway is not registered anymore.", ephemeral: true });
    return;
  }

  if (interaction.customId === participantsButtonId) {
    const participants = Object.values(giveaway.entrants);
    const preview = participants.slice(0, 20).map((entrant) => `${userMention(entrant.userId)} - ${entrant.totalEntries} entries`);
    await interaction.reply({
      content: preview.length > 0 ? preview.join("\n") : "No participants yet.",
      ephemeral: true
    });
    return;
  }

  if (interaction.customId !== activeButtonId) {
    return;
  }

  if (giveaway.status !== "active") {
    await interaction.reply({ content: "This giveaway has already ended.", ephemeral: true });
    return;
  }

  if (!interaction.inCachedGuild() || !(interaction.member instanceof GuildMember)) {
    await interaction.reply({ content: "This giveaway can only be entered in the server.", ephemeral: true });
    return;
  }

  let inviteCount = 0;
  if (giveaway.requirements.requiredInvites) {
    try {
      inviteCount = await getInviteCount(interaction.guild, interaction.user.id);
    } catch {
      await interaction.reply({
        content: "I cannot verify invite requirements. Give me Manage Server permission or remove required invites.",
        ephemeral: true
      });
      return;
    }
  }

  const eligibility = checkEligibility(giveaway, {
    userId: interaction.user.id,
    roleIds: getMemberRoleIds(interaction.member),
    inviteCount
  });

  if (!eligibility.eligible) {
    await interaction.reply({ content: eligibility.reason ?? "You cannot enter this giveaway.", ephemeral: true });
    return;
  }

  const updated = await storage.updateGiveaway(giveaway.messageId, (current) => {
    const entrants = { ...current.entrants };
    if (entrants[interaction.user.id]) {
      delete entrants[interaction.user.id];
    } else {
      entrants[interaction.user.id] = createEntrant(interaction.user.id, eligibility.bonusEntries);
    }

    return {
      ...current,
      entrants
    };
  });

  await updateGiveawayMessage(interaction.client, updated);
  const entered = Boolean(updated.entrants[interaction.user.id]);
  await interaction.reply({
    content: entered ? `You entered with ${eligibility.totalEntries} ${eligibility.totalEntries === 1 ? "entry" : "entries"}.` : "You left this giveaway.",
    ephemeral: true
  });
}

async function handleCommand(interaction: ChatInputCommandInteraction, storage: JsonGiveawayStorage): Promise<void> {
  if (interaction.commandName === "help") {
    await handleHelp(interaction);
    return;
  }

  if (interaction.commandName !== "giveaway") {
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  if (subcommand === "create") {
    await handleCreate(interaction, storage);
  } else if (subcommand === "edit") {
    await handleEdit(interaction, storage);
  } else if (subcommand === "delete") {
    await handleDelete(interaction, storage);
  } else if (subcommand === "end") {
    await handleEnd(interaction, storage);
  } else if (subcommand === "fix") {
    await handleFix(interaction, storage);
  } else if (subcommand === "manager-roles") {
    await handleRoleConfig(interaction, storage, "manager");
  } else if (subcommand === "creator-roles") {
    await handleRoleConfig(interaction, storage, "creator");
  } else if (subcommand === "reroll") {
    await handleReroll(interaction, storage);
  }
}

async function handleInteraction(interaction: Interaction, storage: JsonGiveawayStorage): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction, storage);
    } else if (interaction.isButton()) {
      await handleButton(interaction, storage);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, ephemeral: true }).catch(() => undefined);
      } else {
        await interaction.reply({ content: message, ephemeral: true }).catch(() => undefined);
      }
    }
  }
}

async function checkExpiredGiveaways(client: Client, storage: JsonGiveawayStorage): Promise<void> {
  const activeGiveaways = await storage.listActiveGiveaways();
  const now = Date.now();

  for (const giveaway of activeGiveaways) {
    if (new Date(giveaway.endsAt).getTime() <= now) {
      await endGiveaway(client, storage, giveaway.messageId).catch((error) => {
        console.error(`Failed to end giveaway ${giveaway.messageId}`, error);
      });
    }
  }
}

export function createGiveawayBot(config: BotConfig): Client {
  const storage = new JsonGiveawayStorage(config.storagePath);
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildInvites]
  });

  client.once("ready", async () => {
    console.log(`${slotsbellBrand.name} ready as ${client.user?.tag ?? "unknown"}. Commands loaded: ${commandJson.length}`);
    await checkExpiredGiveaways(client, storage);
    setInterval(() => {
      void checkExpiredGiveaways(client, storage);
    }, 30_000);
  });

  client.on("interactionCreate", (interaction) => {
    void handleInteraction(interaction, storage);
  });

  return client;
}
