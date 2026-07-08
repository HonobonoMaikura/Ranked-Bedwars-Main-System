// utils/safeMove.mjs
export async function safeMovePlayers(guild, playerIds, targetVoiceChannel) {
    for (const playerId of playerIds) {
        try {
            const member = await guild.members.fetch(playerId);
            if (member.voice.channelId) {
                await member.voice.setChannel(targetVoiceChannel);
            } else {
                console.log(`⚠️ プレイヤー <@${playerId}> は直前に切断したため移動をスキップしました。`);
            }
        } catch (err) {
            console.error(`プレイヤー ${playerId} の移動中にエラーが発生しました:`, err);
        }
    }
}