// events/ready.mjs
import { keepBotInVoiceChannel } from '../utils/alwaysConnect.mjs'; // ✨ 追加

export const name = 'ready';
export const once = true;

export async function execute(client) {
    console.log(`✅ ログイン成功: ${client.user.tag}`);
    
    // ✨ Botが起動した瞬間に、特定のVCへ接続させてそのままにする
    await keepBotInVoiceChannel(client);
}