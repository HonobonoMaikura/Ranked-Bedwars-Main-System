// commands/ping.mjs
import { SlashCommandBuilder } from 'discord.js';

// ==========================================
// スラッシュコマンドの設定データ
// ==========================================
// SlashCommandBuilderを使って、Discordに登録するためのデータを作ります
export const data = new SlashCommandBuilder()
    .setName('ping')                    // コマンド名（ /ping になります。必ず小文字！）
    .setDescription('🏓 Pongを返します'); // コマンドを入力するときに出てくる説明文

// ==========================================
// コマンドが実行されたときの処理
// ==========================================
// 引数が (message) から (interaction) に変わります！
// interaction には「どのコマンドが、誰に、どこで実行されたか」のデータが入っています。
export async function execute(interaction) {
    
    // スラッシュコマンドへの返信は message.reply ではなく interaction.reply を使います
    await interaction.reply('🏓 pong!');
    
    console.log(`📝 ${interaction.user.tag} が /ping コマンドを使用`);
}