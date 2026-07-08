// utils/moveToLogCategory.mjs
import { CONFIG } from '../config.mjs';
import { PermissionFlagsBits } from 'discord.js';

/**
 * テキストチャンネルをGame Logsカテゴリーへ移動させ、
 * ScorerとBot以外には見えないように権限をロックする部品
 */
export async function moveToLogCategory(textChannel) {
    const logCategoryId = CONFIG.CATEGORIES.LOG_CATEGORY_ID;
    const scorekeeperRoleId = CONFIG.ROLES.SCOREKEEPER_ROLE_ID;
    const botId = textChannel.client.user.id; // Bot自身のID

    // 1. カテゴリーを移動させる
    await textChannel.setParent(logCategoryId, { lockPermissions: false });

    // 2. ✨ チャンネルの閲覧権限を上書きして非公開化する
    await textChannel.permissionOverwrites.set([
        {
            // サーバーの全員（@everyone）はチャンネルを見られないようにする
            id: textChannel.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
        },
        {
            // Scorer（監督）の役職を持っている人には、閲覧とメッセージ送信を許可する
            id: scorekeeperRoleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ],
        },
        {
            // Bot自身が見えなくなると操作できなくなるので、Botにも許可を与える
            id: botId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels // 最後にチャンネルを削除するため
            ],
        }
    ]);
}