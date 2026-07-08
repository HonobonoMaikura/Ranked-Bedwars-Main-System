// games/queue1Game.mjs
import { getAndIncrementNextGameId } from '../utils/getNextGameId.mjs';
import { createGameTextChannel } from '../utils/createText.mjs';
import { createGameVoiceChannels } from '../utils/createVoice.mjs';
import { sendTeamEmbed } from '../utils/sendEmbed.mjs';
import { safeMovePlayers } from '../utils/safeMove.mjs';
import { CONFIG } from '../config.mjs';

// 進行中のゲーム情報を一時的に記憶しておく共通の箱（メモリ）
export const queue = []; 
export const activeGames = new Map();

// ✨【追加】マッチング〜部屋作成の処理中かどうかを管理するロックフラグ
// これが true の間は、8人集まっても次の startQueue1Game を重複して呼び出さないようにガードします
let isProcessingMatch = false;

/**
 * 🔄 プレイヤーがVCに参加・退出したときに呼び出される関数
 * （※main.mjs や events から呼び出される想定の入口部分です）
 */
export async function handleVoiceStateUpdate(oldState, newState) {
    const queueVcId = CONFIG.CHANNELS.QUEUE1_VC_ID;
    const userId = newState.id;
    const guild = newState.guild;

    // 1. 指定のQueue用VCに入ってきた場合
    if (newState.channelId === queueVcId && oldState.channelId !== queueVcId) {
        if (!queue.includes(userId)) {
            queue.push(userId);
            console.log(`✅ <@${userId}> がQueueに参加しました。現在の人数: ${queue.length}人`);
            
            // 💡 規定人数に達し、かつ「今まさに部屋を作成している最中」でなければ処理を開始！
            if (queue.length >= CONFIG.REQUIRED_PLAYERS && !isProcessingMatch) {
                // 即座にシャッター（ロック）を閉めて、連打や一斉流入による二重起動を防止
                isProcessingMatch = true;

                try {
                    // Queueの先頭から今回の試合に必要な人数（8人）を正確に引き抜く
                    const selectedPlayerIds = queue.splice(0, CONFIG.REQUIRED_PLAYERS);
                    
                    // 司令塔関数を呼び出す
                    await startQueue1Game(newState.client, selectedPlayerIds, guild);
                } catch (err) {
                    console.error("❌ マッチング開始処理でエラー:", err);
                    isProcessingMatch = false; // エラーが起きたらロックを解除
                }
            }
        }
    }

    // 2. Queue用VCから退出（または別のVCへ移動）した場合
    if (oldState.channelId === queueVcId && newState.channelId !== queueVcId) {
        const index = queue.indexOf(userId);
        if (index !== -1) {
            queue.splice(index, 1);
            console.log(`❌ <@${userId}> がQueueから退出しました。現在の人数: ${queue.length}人`);
        }
    }
}

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
            team1Ids: team1Ids, 
            team2Ids: team2Ids  
        });

        console.log(`✅ ゲーム ${textId} が正常にセットアップされました。`);

    } catch (error) {
        console.error('❌ startQueue1Game でエラーが発生しました:', error);
    } finally {
        // 9. ✨【超重要】すべての処理が終わったのでロックを解除！
        isProcessingMatch = false;
        console.log('🔓 マッチング処理が完了し、次のゲームが受付可能になりました。');

        // 💡 もし裏で次の8人がすでに溜まっていたら、連続して次のゲームを即座に安全にスタートさせる
        if (queue.length >= CONFIG.REQUIRED_PLAYERS) {
            isProcessingMatch = true;
            setTimeout(async () => {
                try {
                    const nextPlayerIds = queue.splice(0, CONFIG.REQUIRED_PLAYERS);
                    await startQueue1Game(client, nextPlayerIds, guild);
                } catch (err) {
                    console.error("❌ 連続マッチング処理でエラー:", err);
                    isProcessingMatch = false;
                }
            }, 1000); // 1秒ずらして安全に連鎖起動
        }
    }
}