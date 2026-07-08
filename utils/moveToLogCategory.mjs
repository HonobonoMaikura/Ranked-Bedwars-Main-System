// utils/moveToLogCategory.mjs
import { CONFIG } from '../config.mjs';

/**
 * テキストチャンネルをGame Logsカテゴリーへ移動させる部品
 */
export async function moveToLogCategory(textChannel) {
    const logCategoryId = CONFIG.CATEGORIES.LOG_CATEGORY_ID;
    return await textChannel.setParent(logCategoryId, { lockPermissions: false });
}