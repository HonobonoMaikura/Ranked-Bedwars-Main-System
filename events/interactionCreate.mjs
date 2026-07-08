// events/interactionCreate.mjs
import { activeGames } from '../games/queue1Game.mjs';
import { moveToLogCategory } from '../utils/moveToLogCategory.mjs';
import { cleanupVoiceChannels } from '../utils/cleanupVoiceChannels.mjs';
import { sendDirectorEmbed } from '../utils/sendDirectorEmbed.mjs';
import { CONFIG } from '../config.mjs'; // configをインポート
import { MessageFlags } from 'discord.js';

export const name = 'interactionCreate';
export const once = false;

export async function execute(interaction) {
    try {
        if (!interaction.isButton()) return;

        const customId = interaction.customId;
        const textChannel = interaction.channel;
        const guild = interaction.guild;

        // --------------------------------------------------
        // A. プレイヤーの提出・キャンセルボタンの処理
        // --------------------------------------------------
        if (customId.startsWith('player_submit_')) {
            // カスタムIDの末尾から、コマンドを実行した本人のIDを抽出する
            const parts = customId.split('_');
            const ownerId = parts[parts.length - 1]; // 一番最後の要素（本人ID）

            // ★ガード：ボタンを押した人が、コマンド実行した本人じゃない場合は弾く！
            if (interaction.user.id !== ownerId) {
                return await interaction.reply({
                    content: '❌ この提出の確認ボタンは、コマンドを実行した本人しか押せません。',
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const gameData = activeGames.get(textChannel.id);
            if (!gameData) return await interaction.reply({ content: '❌ ゲームデータがありません。', flags: [MessageFlags.Ephemeral] });

            // 📤 「提出する」が押された場合
            if (customId.startsWith('player_submit_confirm_')) {
                // 元のメッセージ（全員に見えているやつ）を削除してスッキリさせる
                await interaction.message.delete();

                // カテゴリー移動 ➔ 通話クリーンアップ
                await moveToLogCategory(textChannel);
                await cleanupVoiceChannels(guild, gameData.voiceChannelIds);

                // ★新仕様：チーム1・チーム2のIDリストも一緒に渡して、リスト付きのEmbedを送る！
                await sendDirectorEmbed(
                    textChannel, 
                    gameData.gameIdText, 
                    gameData.pendingScreenshotUrl, 
                    gameData.submitUserId,
                    gameData.team1Ids, // ※このあと直すゲームデータから取得
                    gameData.team2Ids  // ※このあと直すゲームデータから取得
                );
            }

            // ❌ 「キャンセル」が押された場合
            if (customId.startsWith('player_submit_cancel_')) {
                gameData.submitStatus = 'NONE';
                gameData.pendingScreenshotUrl = null;
                gameData.submitUserId = null;

                // メッセージを削除して、仕切り直しできるようにする
                await interaction.message.delete();
            }
        }

        // --------------------------------------------------
        // B. 監督（スコアラー）専用判定ボタンの処理
        // --------------------------------------------------
        if (customId.startsWith('director_')) {
            // ★超重要ガード：押した人が「監督ロール」を持っているかチェック！
            const scorekeeperRoleId = CONFIG.ROLES.SCOREKEEPER_ROLE_ID;
            const hasRole = interaction.member.roles.cache.has(scorekeeperRoleId);

            if (!hasRole) {
                return await interaction.reply({
                    content: '❌ この判定ボタンは、監督（スコアラー）の役職を持っている人しか押せません。',
                    flags: [MessageFlags.Ephemeral]
                });
            }

            // ここに監督がボタンを押した後のスコア計算・処理（次回以降実装）が入ります
            await interaction.reply({ content: '⌛ 監督による判定を受理しました。（スコア処理は未実装）', flags: [MessageFlags.Ephemeral] });
        }

    } catch (error) {
        console.error('❌ ボタン処理でエラー:', error);
    }
}