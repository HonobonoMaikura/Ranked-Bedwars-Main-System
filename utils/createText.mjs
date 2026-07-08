// utils/createText.mjs
import { ChannelType } from 'discord.js';

export async function createGameTextChannel(guild, channelName, categoryId) {
    return await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId,
    });
}