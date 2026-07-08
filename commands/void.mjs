// commands/void.mjs
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { activeGames } from '../games/queue1Game.mjs';
import { CONFIG } from '../config.mjs';

export const data = new SlashCommandBuilder()
    .setName('void')
    .setDescription('このゲームの無効化（Void）投票を開始します（参加者のみ実行可能）');

export async function execute(interaction) {
    try {
        const textChannelId = interaction.channelId;

        if (!activeGames.has(textChannelId)) {
            return await interaction.reply({ content: '❌ ここは進行中のゲームチャンネルではありません。', flags: [MessageFlags.Ephemeral] });
        }

        const gameData = activeGames.get(textChannelId);

        // 参加者チェック
        if (!gameData.players.includes(interaction.user.id)) {
            return await interaction.reply({ content: '❌ あなたはこのゲームのプレイヤーではありません。', flags: [MessageFlags.Ephemeral] });
        }

        // 二重処理チェック（提出中、またはすでに他の人がVoid投票中の場合）
        if (gameData.submitStatus !== 'NONE') {
            const userName = gameData.submitUserId ? `<@${gameData.submitUserId}>` : '誰か';
            return await interaction.reply({ 
                content: `⚠️ すでに ${userName} によって手続き（提出またはVoid投票）が開始されています。`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // メモリのステータスを「VOID_VOTING」にロック
        gameData.submitStatus = 'VOID_VOTING';
        gameData.submitUserId = interaction.user.id; // 誰が投票を始めたか記録
        gameData.voidVotes = new Set(); // 投票した人のIDを入れる箱（重複投票防止）

        // 投票開始した人も自動的に1票目としてカウントする
        gameData.voidVotes.add(interaction.user.id);

        const requiredVotes = CONFIG.REQUIRED_VOID_VOTES;
        const currentVotes = gameData.voidVotes.size;

        const voidEmbed = new EmbedBuilder()
            .setColor('#aaaaaa') // グレー
            .setTitle(`⚪ ゲーム ${gameData.gameIdText} 無効化（Void）投票`)
            .setDescription(`<@${interaction.user.id}> 承認のもと、無効試合の投票が開始されました。\nこのゲームを無効にすることに賛成するプレイヤーは、下のボタンを押してください。`)
            .addFields({ name: '📊 現在の賛成票', value: `**${currentVotes}** / ${requiredVotes} 票` })
            .setFooter({ text: '※1分間以内に目標票数に達しない場合は自動で却下されます。' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`player_void_vote_${textChannelId}`)
                .setLabel('👍 賛成する')
                .setStyle(ButtonStyle.Secondary)
        );

        // 全員に見える通常メッセージとして送信
        await interaction.reply({
            embeds: [voidEmbed],
            components: [row]
        });

        // ==========================================
        // ⏱️ 1分間の自動タイムアウト処理（Void用）
        // ==========================================
        setTimeout(async () => {
            try {
                const latestGameData = activeGames.get(textChannelId);
                
                // 1分経った時点で、まだ「VOID_VOTING」のままなら目標未達成で却下
                if (latestGameData && latestGameData.submitStatus === 'VOID_VOTING') {
                    
                    // ロックを解除して初期状態に戻す
                    latestGameData.submitStatus = 'NONE';
                    latestGameData.submitUserId = null;
                    latestGameData.voidVotes = new Set();

                    // 投票メッセージを消去
                    await interaction.deleteReply();

                    // 却下されたログを残す
                    await interaction.channel.send({
                        content: `⏱️ 制限時間内に必要な賛成票（${requiredVotes}票）が集まらなかったため、**無効化投票は却下**されました。ゲームを続行してください。`
                    });

                    console.log(`⏱️ ゲーム ${latestGameData.gameIdText} のVoid投票がタイムアウトにより却下されました。`);
                }
            } catch (err) {
                console.log('（Voidタイムアウト処理：すでに可決終了しているためスルーしました）');
            }
        }, 60000); // 1分

    } catch (error) {
        console.error('❌ /void でエラー:', error);
        await interaction.reply({ content: 'エラーが発生しました。', flags: [MessageFlags.Ephemeral] });
    }
}