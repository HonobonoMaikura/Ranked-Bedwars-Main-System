// utils/cleanupVoiceChannels.mjs
import { CONFIG } from '../config.mjs';

/**
 * 試合用VCに残っているプレイヤーをWaiting Roomへ退避させ、VCを削除する部品
 */
export async function cleanupVoiceChannels(guild, voiceChannelIds) {
    const waitingRoomId = CONFIG.CHANNELS.WAITING_ROOM_VC_ID;

    for (const vcId of voiceChannelIds) {
        try {
            const voiceChannel = await guild.channels.fetch(vcId);
            if (!voiceChannel) continue;

            // ★バグ対策：いま現在、このVCに残っているメンバーを全員退避させる
            for (const [memberId, member] of voiceChannel.members) {
                try {
                    await member.voice.setChannel(waitingRoomId);
                } catch (moveErr) {
                    console.log(`⚠️ プレイヤー ${memberId} の退避に失敗（すでに切断など）:`, moveErr);
                }
            }

            // 完全に空になったのを確認して削除
            await voiceChannel.delete();
        } catch (err) {
            console.error(`ボイスチャンネル ${vcId} の削除中にエラー:`, err);
        }
    }
}