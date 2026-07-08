// events/interactionCreate.mjs
import { activeGames } from '../games/queue1Game.mjs';
import { moveToLogCategory } from '../utils/moveToLogCategory.mjs';
import { cleanupVoiceChannels } from '../utils/cleanupVoiceChannels.mjs';
import { sendDirectorEmbed } from '../utils/sendDirectorEmbed.mjs';
import { CONFIG } from '../config.mjs';
import { MessageFlags, EmbedBuilder } from 'discord.js'; // ✨ EmbedBuilder を追加

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
            const parts = customId.split('_');
            const ownerId = parts[parts.length - 1];

            if (interaction.user.id !== ownerId) {
                return await interaction.reply({
                    content: '❌ この提出の確認ボタンは、コマンドを実行した本人しか押せません。',
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const gameData = activeGames.get(textChannel.id);
            if (!gameData) return await interaction.reply({ content: '❌ ゲームデータがありません。', flags: [MessageFlags.Ephemeral] });

            if (customId.startsWith('player_submit_confirm_')) {
                await interaction.message.delete();
                await moveToLogCategory(textChannel);
                await cleanupVoiceChannels(guild, gameData.voiceChannelIds);

                await sendDirectorEmbed(
                    textChannel, 
                    gameData.gameIdText, 
                    gameData.pendingScreenshotUrl, 
                    gameData.submitUserId,
                    gameData.team1Ids,
                    gameData.team2Ids
                );
            }

            if (customId.startsWith('player_submit_cancel_')) {
                gameData.submitStatus = 'NONE';
                gameData.pendingScreenshotUrl = null;
                gameData.submitUserId = null;
                await interaction.message.delete();
            }
        }

        // --------------------------------------------------
        // B. 監督（スコアラー）専用判定ボタンの処理
        // --------------------------------------------------
        if (customId.startsWith('director_')) {
            const scorekeeperRoleId = CONFIG.ROLES.SCOREKEEPER_ROLE_ID;
            const hasRole = interaction.member.roles.cache.has(scorekeeperRoleId);

            if (!hasRole) {
                return await interaction.reply({
                    content: '❌ この判定ボタンは監督（スコアラー）のみ押せます。',
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const gameData = activeGames.get(textChannel.id);
            if (!gameData) return await interaction.reply({ content: '❌ ゲームデータがありません。', flags: [MessageFlags.Ephemeral] });

            // 1. どちらが勝ったか、またはVoidかを判定
            let winnerText = "";
            let resultColor = "#5865F2"; // デフォルトの色

            if (customId.startsWith('director_win_team1_')) {
                winnerText = "🔵 Team 1";
                resultColor = "#0099ff";
            } else if (customId.startsWith('director_win_team2_')) {
                winnerText = "🔴 Team 2";
                resultColor = "#ff0000";
            } else if (customId.startsWith('director_void_')) {
                winnerText = "⚪ 無効試合 (Void)";
                resultColor = "#aaaaaa";
            }

            // 2. 最終結果のEmbedを作成（画像のデザインに寄せる）
            const team1Mentions = gameData.team1Ids.map(id => `<@${id}>`).join('\n');
            const team2Mentions = gameData.team2Ids.map(id => `<@${id}>`).join('\n');

            const now = new Date();
            // Discordのタイムスタンプ形式を利用（<t:秒:t> = 時刻, <t:秒:d> = 日付）
            const discordTimestamp = `<t:${Math.floor(now.getTime() / 1000)}:t>\n<t:${Math.floor(now.getTime() / 1000)}:d>`;

            const resultEmbed = new EmbedBuilder()
                .setColor(resultColor)
                .setTitle(`🏆 Game ${gameData.gameIdText} 最終結果`)
                .addFields(
                    { name: 'Team 1', value: team1Mentions, inline: true },
                    { name: 'Team 2', value: team2Mentions, inline: true },
                    { name: '\u200B', value: '\u200B', inline: false }, // 空白行
                    { name: '勝者', value: `**${winnerText}**`, inline: false },
                    { name: '終了時刻', value: discordTimestamp, inline: false }
                )
                .setTimestamp();

            // 3. 指定された「最終結果報告チャンネル」へ送信
            const resultChannel = await guild.channels.fetch(CONFIG.CHANNELS.GAME_RESULTS_CHANNEL_ID);
            if (resultChannel) {
                await resultChannel.send({ embeds: [resultEmbed] });
            }

            // 4. メモリから削除
            activeGames.delete(textChannel.id);

            // 5. 監督への応答とクリーンアップ
            await interaction.reply({ content: `✅ ゲーム ${gameData.gameIdText} の結果を記録しました。このチャンネルは間もなく削除されます。` });

            // 5秒後にこのログ用テキストチャンネルを削除（監督が結果を確認する猶予）
            setTimeout(async () => {
                try {
                    await textChannel.delete();
                } catch (e) {
                    console.log("チャンネル削除に失敗（すでにないなど）:", e);
                }
            }, 5000);
        }

        // --------------------------------------------------
        // ✨ C. 無効化（Void）投票ボタンの処理 【新規追加！】
        // --------------------------------------------------
        if (customId.startsWith('player_void_vote_')) {
            const gameData = activeGames.get(textChannel.id);
            if (!gameData) return await interaction.reply({ content: '❌ ゲームデータがありません。', flags: [MessageFlags.Ephemeral] });

            // 1. ガード：このゲームの参加者（8人）じゃない場合は弾く
            if (!gameData.players.includes(interaction.user.id)) {
                return await interaction.reply({
                    content: '❌ あなたはこのゲームのプレイヤーではないため、投票できません。',
                    flags: [MessageFlags.Ephemeral]
                });
            }

            // 2. ガード：すでに投票済みの場合は重複を弾く
            if (gameData.voidVotes.has(interaction.user.id)) {
                return await interaction.reply({
                    content: '⚠️ あなたはすでにこの無効化投票に賛成しています。',
                    flags: [MessageFlags.Ephemeral]
                });
            }

            // 3. 投票を受理（ユーザーIDをSetに追加）
            gameData.voidVotes.add(interaction.user.id);

            const requiredVotes = CONFIG.REQUIRED_VOID_VOTES;
            const currentVotes = gameData.voidVotes.size;

            // 4. もし目標票数に達した場合 ➔ 【可決・ゲーム強制終了】
            if (currentVotes >= requiredVotes) {
                // 投票メッセージ（ボタン付き）を削除して終わらせる
                await interaction.message.delete();

                // カテゴリーを「Game Logs」へ移動
                await moveToLogCategory(textChannel);

                // ボイスチャンネルをクリーンアップ（Waiting Roomへ退避＆削除）
                await cleanupVoiceChannels(guild, gameData.voiceChannelIds);

                // メモリからゲームデータを削除して完全に終了させる
                activeGames.delete(textChannel.id);

                // ログチャンネルに最終結果を通知
                const voidSuccessEmbed = new EmbedBuilder()
                    .setColor('#ff0000') // 赤色
                    .setTitle(`⚪ ゲーム ${gameData.gameIdText} 無効試合 (Void)`)
                    .setDescription(`規定人数（${requiredVotes}人）の賛成が集まったため、このゲームは**無効試合（Void）として処理されました**。\nプレイヤーの通話は切断（退避）され、スコアの変動はありません。`)
                    .setTimestamp();

                await textChannel.send({ embeds: [voidSuccessEmbed] });
                
                console.log(`⚪ ゲーム ${gameData.gameIdText} がプレイヤー投票により正常にVoid処理されました。`);
                return;
            }

            // 5. 目標票数に達していない場合 ➔ 【現在の票数をリアルタイム更新】
            // メッセージ（Embed）の票数表示だけを書き換える
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setFields({ name: '📊 現在の賛成票', value: `**${currentVotes}** / ${requiredVotes} 票` });

            // update() を使うことで、ピカピカと画面がブレずに票数だけが「カチッ」と上がります
            await interaction.update({
                embeds: [updatedEmbed]
            });
        }

    } catch (error) {
        console.error('❌ ボタン処理でエラー:', error);
    }
}