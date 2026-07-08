// utils/alwaysConnect.mjs
import { joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { CONFIG } from '../config.mjs';

/**
 * Botを指定のボイスチャンネルに常駐させる関数
 * @param {Client} client - Discordのクライアントオブジェクト
 */
export async function keepBotInVoiceChannel(client) {
    const vcId = CONFIG.CHANNELS.ALWAYS_CONNECT_VC_ID;
    
    // configにIDが設定されていない場合は何もしない
    if (!vcId || vcId === 'ここに常駐させたいVCのID') return;

    try {
        // チャンネルの情報を取得
        const channel = await client.channels.fetch(vcId).catch(() => null);
        if (!channel || !channel.isVoiceBased()) {
            console.log('⚠️ 常駐対象のボイスチャンネルが見つからないか、不適切なチャンネルタイプです。');
            return;
        }

        console.log(`🔊 ボイスチャンネル「${channel.name}」への常駐接続を開始します...`);

        // ボイスチャンネルに接続
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfMute: false,  // Bot自身のマイクをミュート（画像等と同じにするため推奨）
            selfDeaf: false,  // Botのスピーカーをミュート（サーバーの負荷軽減）
        });

        // 🛑 もし誰かに強制切断されたり、ネットワークエラーで切断された場合の自動再接続ロジック
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.log('⚠️ 常駐VCから切断されました。5秒後に再接続を試みます...');
            
            // 5秒待ってから再接続を試みる安全装置
            setTimeout(() => {
                keepBotInVoiceChannel(client);
            }, 5000);
        });

    } catch (error) {
        console.error('❌ 常駐VCへの接続中にエラーが発生しました:', error);
    }
}