// events/guildMemberAdd.mjs
import { EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config.mjs';

export const name = 'guildMemberAdd';
export const once = false;

export async function execute(member) {
    try {
        const guild = member.guild;
        const welcomeChannelId = CONFIG.CHANNELS.WELCOME_CHANNEL_ID;

        // 設定されていない、またはプレースホルダーのままなら処理をスキップ
        if (!welcomeChannelId) return;

        // 投稿先のチャンネルを取得
        const channel = await guild.channels.fetch(welcomeChannelId).catch(() => null);
        if (!channel) return;

        // 🏆 ウェルカムEmbedの作成（Ranked Bedwarsの案内風）
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#5865F2') // Discordパープル風
            .setTitle(`👋 Welcome to ${guild.name}!`)
            .setDescription(`ようこそ、${member} さん！\n当サーバーは **HonobonoMaikura** のコミュニティサーバーです！`)
            .addFields(
                { 
                    name: '📌 サーバールールは確認しましたか？',  
                    value: `<#1524331033066209301>で確認しましょう！` 
                },
                {
                    name: '📊 現在のサーバーメンバー数',
                    value: `あなたの参加で **${guild.memberCount}** 人目になりました！🎉`,
                    inline: false
                }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true })) // 本人のアイコンを右上に表示
            .setTimestamp();

        // チャンネルにメンション付きでEmbedを送信
        await channel.send({
            content: `✨ ${member} さん、いらっしゃいませ！`,
            embeds: [welcomeEmbed]
        });

        console.log(`📢 新規メンバー ${member.user.tag} へのWelcomeメッセージを送信しました。`);

    } catch (error) {
        console.error('❌ Welcomeメッセージ送信中にエラーが発生しました:', error);
    }
}