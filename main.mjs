// main.mjs - Discord Botのメインプログラム

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
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates, // ボイスチャンネル監視用権限
    ],
});

client.commands = new Collection();

// --------------------------------------------------
// A. commands フォルダからスラッシュコマンドを自動読み込み
// --------------------------------------------------
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.mjs'));
const commandsData = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsData.push(command.data.toJSON());
        console.log(`Loaded command: ${command.data.name}`);
    }
}

// スラッシュコマンドをDiscordに登録する関数
async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('🔄 スラッシュコマンドをDiscordに登録中...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsData });
        console.log('✅ スラッシュコマンドの登録が完了しました！');
    } catch (error) {
        console.error('❌ コマンドの登録中にエラーが発生しました:', error);
    }
}

// --------------------------------------------------
// B. events フォルダからイベント監視ファイルを自動読み込み
// --------------------------------------------------
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.mjs'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = await import(`file://${filePath}`);
    
    if ('name' in event && 'execute' in event) {
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`Loaded event: ${event.name}`);
    }
}

// --------------------------------------------------
// C. 起動時 ＆ コマンド実行時の基本イベント
// --------------------------------------------------
client.once('clientReady', async () => {
    console.log(`🎉 ${client.user.tag} が正常に起動しました！`);
    await registerCommands();
});

client.on('interactionCreate', async (interaction) => {
    // スラッシュコマンドの実行
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'コマンドの実行中にエラーが発生しました。', ephemeral: true });
        }
    }
});

// エラーハンドリング・プロセス終了処理
client.on('error', (error) => console.error('❌ Discord クライアントエラー:', error));
process.on('SIGINT', () => { client.destroy(); process.exit(0); });

// Discord にログイン
if (!process.env.DISCORD_TOKEN) { process.exit(1); }
client.login(process.env.DISCORD_TOKEN);

// Express Webサーバー
const app = express();
app.get('/', (req, res) => { res.json({ status: 'Bot is running! 🤖' }); });
app.listen(process.env.PORT || 3000);