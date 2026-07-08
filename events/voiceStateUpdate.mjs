// events/voiceStateUpdate.mjs
import { ChannelType } from 'discord.js';
import { startQueue1Game } from '../games/queue1Game.mjs';
import { CONFIG } from '../config.mjs'; // ✨ configをインポート

export const name = 'voiceStateUpdate';
export const once = false;

export async function execute(oldState, newState) {
    try {
        // ✨ configから設定値を自動取得
        const queue1Id = CONFIG.CHANNELS.QUEUE1_VC_ID;
        const requiredPlayers = CONFIG.REQUIRED_PLAYERS;

        // 誰かが新しく設定された Queue1 チャンネルに入った、またはチャンネルを移動してきた場合
        if (newState.channelId === queue1Id && oldState.channelId !== newState.channelId) {
            
            const queueChannel = newState.channel;
            if (!queueChannel || queueChannel.type !== ChannelType.GuildVoice) return;

            // 現在入っている人数を数える
            const memberCount = queueChannel.members.size;
            console.log(`🔊 Queue1 にプレイヤーが参加しました (${memberCount}/${requiredPlayers})`);

            // 設定人数以上集まったかを検知
            if (memberCount >= requiredPlayers) {
                console.log(`🎉 必要人数（${requiredPlayers}人以上）が集まりました！選考を開始します。`);

                const currentMembers = Array.from(queueChannel.members.keys());
                // 先頭から必要人数だけを正確に選別
                const selectedPlayerIds = currentMembers.slice(0, requiredPlayers);

                // 司令塔関数を呼び出してゲームを開始する
                await startQueue1Game(newState.client, selectedPlayerIds, newState.guild);
            }
        }
    } catch (error) {
        console.error('❌ voiceStateUpdate イベント内でエラーが発生しました:', error);
    }
}