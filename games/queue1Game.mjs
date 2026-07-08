// games/queue1Game.mjs
import { getAndIncrementNextGameId } from '../utils/getNextGameId.mjs';
import { createGameTextChannel } from '../utils/createText.mjs';
import { createGameVoiceChannels } from '../utils/createVoice.mjs';
import { sendTeamEmbed } from '../utils/sendEmbed.mjs';
import { safeMovePlayers } from '../utils/safeMove.mjs';
import { CONFIG } from '../config.mjs'; // ✨ configをインポート

// 進行中のゲーム情報を一時的に記憶しておく共通の箱（メモリ）
export const activeGames = new Map();

/**
 * Queue1 (4v4) のゲームを開始する司令塔関数
 */
export async function startQueue1Game(client, selectedPlayerIds, guild) {
    try {
        // ✨ configから自動計算されたチーム人数とカテゴリーIDを取得
        const TEAM_SIZE = CONFIG.TEAM_SIZE;
        const TEXT_CATEGORY_ID = CONFIG.CATEGORIES.TEXT_CATEGORY_ID;
        const VOICE_CATEGORY_ID = CONFIG.CATEGORIES.VOICE_CATEGORY_ID;

        // 2. 【utils/getNextGameId.mjs】ゲーム番号の発行
        const { textId, channelName } = getAndIncrementNextGameId();

        // 3. チーム分け（シャッフル）
        const shuffled = [...selectedPlayerIds].sort(() => Math.random() - 0.5);
        const team1Ids = shuffled.slice(0, TEAM_SIZE);
        const team2Ids = shuffled.slice(TEAM_SIZE);

        // 4. 【utils/createText.mjs】テキストチャンネル作成
        const textChannel = await createGameTextChannel(guild, channelName, TEXT_CATEGORY_ID);

        // 5. 【utils/createVoice.mjs】ボイスチャンネル作成
        const { team1Voice, team2Voice } = await createGameVoiceChannels(guild, textId, VOICE_CATEGORY_ID);

        // 6. 【utils/sendEmbed.mjs】チーム分けテキストの送信
        await sendTeamEmbed(textChannel, textId, team1Ids, team2Ids);

        // 7. 【utils/safeMove.mjs】プレイヤーの安全移動
        await safeMovePlayers(guild, team1Ids, team1Voice);
        await safeMovePlayers(guild, team2Ids, team2Voice);

        // 8. 共通のメモリ（activeGames）にこのゲームの情報を保存
        activeGames.set(textChannel.id, {
            gameIdText: textId,
            players: selectedPlayerIds,
            submitStatus: 'NONE',
            submitUserId: null,
            voidVotes: new Set(),
            voiceChannelIds: [team1Voice.id, team2Voice.id],
            team1Ids: team1Ids, // ✨ これを書き足す！
            team2Ids: team2Ids  // ✨ これを書き足す！
        });

        console.log(`✅ ゲーム ${textId} が正常にセットアップされました。`);

    } catch (error) {
        console.error('❌ startQueue1Game でエラーが発生しました:', error);
    }
}