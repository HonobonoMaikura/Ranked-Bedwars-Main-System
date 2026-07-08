// utils/createText.mjs
import { ChannelType } from 'discord.js';

export async function createGameTextChannel(guild, channelName, categoryId) {
    // channelName が「game-001」などの場合、先頭に「└─」を結合する
    const formattedName = `┗${channelName}`;

    const textChannel = await guild.channels.create({
        name: formattedName, // ✨ └─ が付いた名前を適用！
        type: ChannelType.GuildText, // GuildText
        parent: categoryId
    });

    return textChannel;
}