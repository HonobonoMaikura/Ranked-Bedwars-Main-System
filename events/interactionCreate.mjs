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
                return await interaction.reply({ content: '❌ この判定ボタンは監督（スコアラー）のみ押せます。', flags: [MessageFlags.Ephemeral] });
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
                winnerText = "⚪ 無効試合 (Void)"; // 監督によるVoid
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
        // C. 無効化（Void）投票ボタンの処理 【修正箇所！】
        // --------------------------------------------------
        if (customId.startsWith('player_void_vote_')) {
            const gameData = activeGames.get(textChannel.id);
            if (!gameData) return await interaction.reply({ content: '❌ ゲームデータがありません。', flags: [MessageFlags.Ephemeral] });

            if (!gameData.players.includes(interaction.user.id)) {
                return await interaction.reply({ content: '❌ あなたはこのゲームのプレイヤーではないため、投票できません。', flags: [MessageFlags.Ephemeral] });
            }

            if (gameData.voidVotes.has(interaction.user.id)) {
                return await interaction.reply({ content: '⚠️ あなたはすでにこの無効化投票に賛成しています。', flags: [MessageFlags.Ephemeral] });
            }

            gameData.voidVotes.add(interaction.user.id);

            const requiredVotes = CONFIG.REQUIRED_VOID_VOTES;
            const currentVotes = gameData.voidVotes.size;

            // 🛑 目標票数に達した場合 ➔ 【可決・ゲーム強制終了】
            if (currentVotes >= requiredVotes) {
                await interaction.message.delete().catch(() => {});

                // 1. ✨【修正】Games（結果）チャンネルにも、画像と同じ綺麗なフォーマットでVoidのログを残す！
                const team1Mentions = gameData.team1Ids.map(id => `<@${id}>`).join('\n');
                const team2Mentions = gameData.team2Ids.map(id => `<@${id}>`).join('\n');
                const now = new Date();
                const discordTimestamp = `<t:${Math.floor(now.getTime() / 1000)}:t>\n<t:${Math.floor(now.getTime() / 1000)}:d>`;

                const globalResultEmbed = new EmbedBuilder()
                    .setColor('#aaaaaa') // グレー
                    .setTitle(`🏆 Game ${gameData.gameIdText} 最終結果`)
                    .addFields(
                        { name: 'Team 1', value: team1Mentions, inline: true },
                        { name: 'Team 2', value: team2Mentions, inline: true },
                        { name: '\u200B', value: '\u200B', inline: false },
                        { name: '勝者', value: `**⚪ 無効試合 (Void)**`, inline: false },
                        { name: '終了時刻', value: discordTimestamp, inline: false }
                    )
                    .setTimestamp();

                const resultChannel = await guild.channels.fetch(CONFIG.CHANNELS.GAME_RESULTS_CHANNEL_ID).catch(() => null);
                if (resultChannel) {
                    await resultChannel.send({ embeds: [globalResultEmbed] });
                }

                // 2. 移動とクリーンアップ
                await moveToLogCategory(textChannel);
                await cleanupVoiceChannels(guild, gameData.voiceChannelIds);

                // 3. 移動後の非公開ログチャンネル側にも、一応確定メッセージを残す
                const voidSuccessEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`⚪ ゲーム ${gameData.gameIdText} 無効試合 (Void)`)
                    .setDescription(`規定人数（${requiredVotes}人）の賛成が集まったため、このゲームは無効試合として処理されました。`)
                    .setTimestamp();

                await textChannel.send({ embeds: [voidSuccessEmbed] });
                
                // 4. メモリから削除
                activeGames.delete(textChannel.id);
                
                console.log(`⚪ ゲーム ${gameData.gameIdText} がプレイヤー投票によりVoid終了し、Gamesチャンネルにログが残りました。`);
                return;
            }

            // 目標票数に達していない場合は、現在の票数をリアルタイム更新
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setFields({ name: '📊 現在の賛成票', value: `**${currentVotes}** / ${requiredVotes} 票` });

            await interaction.update({ embeds: [updatedEmbed] });
        }

    } catch (error) {
        console.error('❌ ボタン処理でエラー:', error);
    }
}