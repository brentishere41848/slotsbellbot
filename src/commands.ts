import {
  ChannelType,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder
} from "discord.js";

export const supportedGiveawayChannelTypes = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement
] as const;

function addGiveawayOptions<T extends SlashCommandSubcommandBuilder>(command: T, messageId = false): T {
  if (messageId) {
    command.addStringOption((option) =>
      option
        .setName("message-id")
        .setDescription("The giveaway message ID")
        .setRequired(true)
    );
  }

  command
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration like 1m, 1h, 1d, or 1w")
        .setRequired(!messageId)
    )
    .addIntegerOption((option) =>
      option
        .setName("winners")
        .setDescription("The number of winners")
        .setRequired(!messageId)
        .setMinValue(1)
        .setMaxValue(50)
    )
    .addStringOption((option) =>
      option
        .setName("prize")
        .setDescription("The prize for this giveaway")
        .setRequired(!messageId)
        .setMaxLength(256)
    )
    .addUserOption((option) =>
      option
        .setName("host")
        .setDescription("The host of this giveaway")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("roles-bonus-entries")
        .setDescription("Example: @role1 2 @role2 5")
        .setRequired(false)
        .setMaxLength(1000)
    )
    .addIntegerOption((option) =>
      option
        .setName("required-invites")
        .setDescription("The amount of active invite uses required to enter")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(100000)
    )
    .addRoleOption((option) =>
      option
        .setName("required-role")
        .setDescription("The role required for this giveaway")
        .setRequired(false)
    )
    .addRoleOption((option) =>
      option
        .setName("blocked-role")
        .setDescription("The role that cannot enter this giveaway")
        .setRequired(false)
    )
    .addRoleOption((option) =>
      option
        .setName("giveaway-winners-role")
        .setDescription("The role the bot gives to winners")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("giveaway-create-message")
        .setDescription("Message sent above the giveaway")
        .setRequired(false)
        .setMaxLength(1000)
    )
    .addStringOption((option) =>
      option
        .setName("giveaway-winners-dm-message")
        .setDescription("DM message sent to winners")
        .setRequired(false)
        .setMaxLength(1000)
    )
    .addStringOption((option) =>
      option
        .setName("image")
        .setDescription("Image URL for the embed bottom")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("thumbnail")
        .setDescription("Thumbnail URL for the embed top right")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("Hex color for active giveaways, like #5865F2")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("end-color")
        .setDescription("Hex color after the giveaway ends")
        .setRequired(false)
    );

  if (!messageId) {
    command.addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel this giveaway will be created in")
        .setRequired(false)
        .addChannelTypes(...supportedGiveawayChannelTypes)
    );
  }

  return command;
}

function addRoleConfigOptions(command: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return command
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("How to update the roles")
        .setRequired(true)
        .addChoices(
          { name: "set", value: "set" },
          { name: "add", value: "add" },
          { name: "remove", value: "remove" },
          { name: "clear", value: "clear" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("roles")
        .setDescription("Role mentions or role IDs")
        .setRequired(false)
        .setMaxLength(1000)
    );
}

export const giveawayCommand = new SlashCommandBuilder()
  .setName("giveaway")
  .setDescription("Giveaway commands")
  .addSubcommand((command) => addGiveawayOptions(command.setName("create").setDescription("Create a giveaway")))
  .addSubcommand((command) => addGiveawayOptions(command.setName("edit").setDescription("Edit a giveaway"), true))
  .addSubcommand((command) =>
    command
      .setName("delete")
      .setDescription("Delete a giveaway")
      .addStringOption((option) =>
        option
          .setName("message-id")
          .setDescription("The giveaway message ID")
          .setRequired(true)
      )
  )
  .addSubcommand((command) =>
    command
      .setName("end")
      .setDescription("End a giveaway with the giveaway message ID")
      .addStringOption((option) =>
        option
          .setName("message-id")
          .setDescription("The giveaway message ID")
          .setRequired(true)
      )
  )
  .addSubcommand((command) =>
    command
      .setName("fix")
      .setDescription("Fix a giveaway if it fails to end")
      .addStringOption((option) =>
        option
          .setName("message-id")
          .setDescription("The giveaway message ID")
          .setRequired(true)
      )
  )
  .addSubcommand((command) =>
    addRoleConfigOptions(command
      .setName("manager-roles")
      .setDescription("Set roles with which people can use every command in the bot"))
  )
  .addSubcommand((command) =>
    addRoleConfigOptions(command
      .setName("creator-roles")
      .setDescription("Set roles with which people can only create or schedule giveaways"))
  )
  .addSubcommand((command) =>
    command
      .setName("reroll")
      .setDescription("Reroll the winner of a giveaway with giveaway message ID")
      .addStringOption((option) =>
        option
          .setName("message-id")
          .setDescription("The giveaway message ID")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("winners")
          .setDescription("The number of winners to reroll")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(50)
      )
      .addBooleanOption((option) =>
        option
          .setName("include-previous-winners")
          .setDescription("Whether previous winners may win again")
          .setRequired(false)
      )
      .addStringOption((option) =>
        option
          .setName("exclude")
          .setDescription("Extra user IDs or mentions to exclude")
          .setRequired(false)
          .setMaxLength(1000)
      )
  );

export const helpCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Show Slotsbell giveaway help");

export const commands = [giveawayCommand, helpCommand];

export const commandJson = commands.map((command) => command.toJSON());

export type RoleConfigAction = "set" | "add" | "remove" | "clear";

export function _assertNoSubcommandGroups(_command: SlashCommandSubcommandGroupBuilder): void {
  return;
}
