// utils/sendDirectorEmbed.mjs
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Logsチャンネルに、監督専用の勝敗判定メッセージ（チームリスト付き）を送信する
 */
export async function sendDirectorEmbed(textChannel, gameIdText, screenshotUrl, submitUserId, team1Ids, team2Ids) {
    // メンバーIDをメンション文字列に変換
    const team1Mentions = team1Ids.map(id => `<@${id}>`).join('\n');
    const team2Mentions = team2Ids.map(id => `<@${id}>`).join('\n');

    const directorEmbed = new EmbedBuilder()
        .setColor('#ffd700')
        .setTitle(`🗃️ ゲーム ${gameIdText} 判定待ち`)
        .setDescription(`<@${submitUserId}> から提出された証拠画像です。\n監督（管理者）は画像を確認し、正しい結果を選択してください。`)
        .setImage(screenshotUrl)
        // ★ 画像の下にチームリストを2列で追加！
        .addFields(
            { name: '🔵 Team 1 メンバー', value: team1Mentions, inline: true },
            { name: '🔴 Team 2 メンバー', value: team2Mentions, inline: true }
        )
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`director_win_team1_${textChannel.id}`)
            .setLabel('🔵 Team 1 勝利')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`director_win_team2_${textChannel.id}`)
            .setLabel('🔴 Team 2 勝利')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`director_void_${textChannel.id}`)
            .setLabel('⚪ 無効試合 (Void)')
            .setStyle(ButtonStyle.Secondary)
    );

    return await textChannel.send({
        embeds: [directorEmbed],
        components: [row]
    });
}