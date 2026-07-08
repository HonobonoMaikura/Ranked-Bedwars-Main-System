// commands/submit.mjs
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { activeGames } from '../games/queue1Game.mjs';

export const data = new SlashCommandBuilder()
    .setName('submit')
    .setDescription('ゲームの結果をスクリーンショット付きで提出します')
    .addAttachmentOption(option => 
        option.setName('screenshot')
            .setDescription('結果画面のスクリーンショットを添付してください')
            .setRequired(true)
    );

export async function execute(interaction) {
    try {
        const textChannelId = interaction.channelId;

        if (!activeGames.has(textChannelId)) {
            return await interaction.reply({ content: '❌ ここは進行中のゲームチャンネルではありません。', flags: [MessageFlags.Ephemeral] });
        }

        const gameData = activeGames.get(textChannelId);

        if (!gameData.players.includes(interaction.user.id)) {
            return await interaction.reply({ content: '❌ あなたはこのゲームのプレイヤーではありません。', flags: [MessageFlags.Ephemeral] });
        }

        if (gameData.submitStatus !== 'NONE') {
            return await interaction.reply({ 
                content: `⚠️ すでに <@${gameData.submitUserId}> によって結果提出（またはVoid）の手続きが開始されています。`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const screenshot = interaction.options.getAttachment('screenshot');
        if (!screenshot.contentType?.startsWith('image/')) {
            return await interaction.reply({ content: '❌ スクリーンショット（画像ファイル）を添付してください。', flags: [MessageFlags.Ephemeral] });
        }

        // メモリに情報を一時保存してロック
        gameData.pendingScreenshotUrl = screenshot.url;
        gameData.submitUserId = interaction.user.id;
        gameData.submitStatus = 'PENDING';

        const submitEmbed = new EmbedBuilder()
            .setColor('#ffd700')
            .setTitle(`🏁 ゲーム ${gameData.gameIdText} 結果提出の確認`)
            .setDescription(`<@${interaction.user.id}> から結果がアップロードされました。\nこの画像を証拠として、監督へ提出してもよろしいですか？\n※1分間放置すると自動的にキャンセルされます。`)
            .setImage(screenshot.url)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`player_submit_confirm_${textChannelId}_${interaction.user.id}`)
                .setLabel('📤 提出する')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`player_submit_cancel_${textChannelId}_${interaction.user.id}`)
                .setLabel('❌ キャンセル')
                .setStyle(ButtonStyle.Secondary)
        );

        // メッセージを送信
        const response = await interaction.reply({
            embeds: [submitEmbed],
            components: [row]
        });

        // ==========================================
        // ⏱️ 1分間の自動タイムアウト処理を追加！
        // ==========================================
        setTimeout(async () => {
            try {
                const latestGameData = activeGames.get(textChannelId);
                
                if (latestGameData && 
                    latestGameData.submitStatus === 'PENDING' && 
                    latestGameData.submitUserId === interaction.user.id) {
                    
                    // 1. メモリのロックを解除
                    latestGameData.submitStatus = 'NONE';
                    latestGameData.pendingScreenshotUrl = null;
                    latestGameData.submitUserId = null;

                    // 2. 放置された確認メッセージを消去
                    await interaction.deleteReply();
                    
                    // 3. ✨【追加】タイムアウトの通知をチャンネルに投稿する
                    await interaction.channel.send({
                        content: `⏱️ <@${interaction.user.id}> による提出確認が **1分間放置されたため自動キャンセル** されました。\nもう一度結果を提出する場合は、最初から \`/submit\` をやり直してください。`
                    });

                    console.log(`⏱️ ゲーム ${latestGameData.gameIdText} がタイムアウトのため自動リセットされました。`);
                }
            } catch (timeoutErr) {
                // すでにボタンが押されてメッセージが消えている場合は安全にスルー
                console.log('（タイムアウト処理：すでに提出済みのためスルーしました）');
            }
        }, 60000); // 1分

    } catch (error) {
        console.error('❌ /submit でエラー:', error);
        await interaction.reply({ content: 'エラーが発生しました。', flags: [MessageFlags.Ephemeral] });
    }
}