// utils/createVoice.mjs
import { ChannelType } from 'discord.js';

export async function createGameVoiceChannels(guild, gameIdText, categoryId) {
    const team1Voice = await guild.channels.create({
        name: `Game ${gameIdText} Team 1`,
        type: ChannelType.GuildVoice,
        parent: categoryId,
    });

    const team2Voice = await guild.channels.create({
        name: `Game ${gameIdText} Team 2`,
        type: ChannelType.GuildVoice,
        parent: categoryId,
    });

    return { team1Voice, team2Voice };
}