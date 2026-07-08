// events/voiceStateUpdate.mjs

// ==========================================
// イベントの設定と処理
// ==========================================
export const name = 'voiceStateUpdate'; // 反応するDiscordのイベント名
export const once = false;             // 何回も繰り返し実行するので false

// イベントが発生したときに実行される処理
// 引数の (oldState, newState) には、移動前と移動後の通話状態が入っています
export async function execute(oldState, newState) {
    // メンバーがボイスチャンネルに「入った」または「移動した」ときだけチェック
    //（チャンネルが null でない ＝ どこかのチャンネルにいる状態）
    if (newState.channelId !== null && oldState.channelId !== newState.channelId) {
        
        // ユーザーが入ったボイスチャンネルを取得
        const channel = newState.channel;
        
        // そのチャンネルに今何人いるか数える (.size)
        const memberCount = channel.members.size;
        
        console.log(`🔊 ${channel.name} の現在の人数: ${memberCount}人`);

        // ぴったり8人になった瞬間を検知
        if (memberCount === 8) {
            console.log(`🎉 ${channel.name} が8人になりました！イベントを発生させます！`);
            
            // 例：そのボイスチャンネルがあるサーバーの、最初のテキストチャンネルにメッセージを送る
            const textChannel = channel.guild.systemChannel || channel.guild.channels.cache.find(c => c.isTextBased());
            if (textChannel) {
                await textChannel.send(`📢 **${channel.name}** が8人になりました！ゲームを始めましょう！ 🎮`);
            }
        }
    }
}