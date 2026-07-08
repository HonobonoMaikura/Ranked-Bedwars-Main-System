// utils/sendEmbed.mjs
import { EmbedBuilder } from 'discord.js';

/**
 * チーム分けメッセージをEmbed（横2列）で送信する
 */
export async function sendTeamEmbed(textChannel, gameIdText, team1Ids, team2Ids) {
    // メンバーIDの配列をメンションの文字列にする
    const team1Mentions = team1Ids.map(id => `<@${id}>`).join('\n');
    const team2Mentions = team2Ids.map(id => `<@${id}>`).join('\n');

    // 🏆 Embed（きれいなカード型のメッセージ）を組み立てる
    const teamEmbed = new EmbedBuilder()
        .setColor('#00ff00') // 左側の線の色（画像のような緑色なら #00ff00）
        .setTitle(`🏆 Game ${gameIdText} 開始`) // タイトル
        .addFields(
            // inline: true にすることで、横に並んでくれます
            { name: '🔵 Team 1', value: team1Mentions, inline: true },
            { name: '🔴 Team 2', value: team2Mentions, inline: true }
        )
        .setDescription('🚨 プレイヤーをボイスチャンネルへ移動させます...')
        .setTimestamp(); // 右下に時間を表示（オプション）

    // 組み立てたEmbedを送信
    return await textChannel.send({ embeds: [teamEmbed] });
}