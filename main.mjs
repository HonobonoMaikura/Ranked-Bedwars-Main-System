// main.mjs - Discord Botのメインプログラム（スラッシュコマンド対応版）

import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // スラッシュコマンド（Interaction）の受信にはこれだけでOKです！
    ],
});

// コマンドを保管する箱
client.commands = new Collection();

// --- commandsフォルダからファイルを自動読み込み ---
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.mjs'));

// Discordに登録するためのコマンドデータを一時的に集める配列（リスト）
const commandsData = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    
    if ('data' in command && 'execute' in command) {
        // 箱にコマンドを登録（中身を実行するため）
        client.commands.set(command.data.name, command);
        
        // Discord登録用に、データの形をJSONという形式に変換して配列に追加
        commandsData.push(command.data.toJSON());
        
        console.log(`Loaded command: ${command.data.name}`);
    } else {
        console.log(`[WARNING] ${filePath} には "data" または "execute" がありません。`);
    }
}

// --- Discordへスラッシュコマンドを自動登録（デプロイ）する関数 ---
async function registerCommands() {
    // DiscordのAPI（連絡窓口）を準備
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 スラッシュコマンドをDiscordに登録中...');

        // Botが参加しているすべてのサーバーで使えるようにグローバル登録します
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandsData },
        );

        console.log('✅ スラッシュコマンドの登録が完了しました！');
    } catch (error) {
        console.error('❌ コマンドの登録中にエラーが発生しました:', error);
    }
}

// --------------------------------------------------
// イベント処理
// --------------------------------------------------

// Botが正常に起動完了したときの処理
client.once('clientReady', async () => {
    console.log(`🎉 ${client.user.tag} が正常に起動しました！`);
    console.log(`📊 ${client.guilds.cache.size} つのサーバーに参加中`);
    
    // 起動したタイミングで、さっき作った登録関数を実行する
    await registerCommands();
});

// 【変更！】誰かがスラッシュコマンドなど（インタラクション）を起こしたときの処理
client.on('interactionCreate', async (interaction) => {
    // 起こされた行動が「チャットのスラッシュコマンド」じゃなければ無視（ボタン等もあるため）
    if (!interaction.isChatInputCommand()) return;

    // 実行されたコマンド名と同じものを箱から探す
    const command = client.commands.get(interaction.commandName);

    // なければ無視
    if (!command) return;

    try {
        // コマンドファイル内の execute を実行（引数は interaction になる！）
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        // エラーが起きたら、Discord上でユーザーにエラーを伝える
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'コマンドの実行中にエラーが発生しました。', ephemeral: true });
        } else {
            await interaction.reply({ content: 'コマンドの実行中にエラーが発生しました。', ephemeral: true });
        }
    }
});

// エラーハンドリング
client.on('error', (error) => {
    console.error('❌ Discord クライアントエラー:', error);
});

// プロセス終了時の処理
process.on('SIGINT', () => {
    console.log('🛑 Botを終了しています...');
    client.destroy();
    process.exit(0);
});

// Discord にログイン
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN が .env ファイルに設定されていません！');
    process.exit(1);
}

console.log('🔄 Discord に接続中...');
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ ログインに失敗しました:', error);
    process.exit(1);
});

// Express Webサーバーの設定（Render用）
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({
        status: 'Bot is running! 🤖',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`🌐 Web サーバーがポート ${port} で起動しました`);
});