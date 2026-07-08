// config.mjs - Botの全設定を一括管理するファイル

export const CONFIG = {
    // --------------------------------------------------
    // 🧪 テストモード切り替えフラグ
    //    true  ➔ 2人集まったら1チーム1人で即開始（テスト用）
    //    false ➔ 8人集まったら1チーム4人で開始（本番用）
    // --------------------------------------------------
    IS_TEST_MODE: true,

    // --------------------------------------------------
    // 🆔 各種チャンネル・カテゴリーのDiscord ID
    //    (あなたのサーバーのIDに書き換えてください)
    // --------------------------------------------------
    CHANNELS: {
        QUEUE1_VC_ID: '1524357859251323051', // ここにQueue1のボイスチャンネルID
        WAITING_ROOM_VC_ID: '1524357804285104168', // ここにWaiting RoomのボイスチャンネルID
        GAME_RESULTS_CHANNEL_ID: '1524357625427263499', // ここにGamesテキストチャンネルのID
    },
    
    CATEGORIES: {
        TEXT_CATEGORY_ID: '1524357930185396224', // ここにGame TextsのカテゴリーID
        VOICE_CATEGORY_ID: '1524357963911794799', // ここにGame CallsのカテゴリーID
        LOG_CATEGORY_ID: '1524357984073945132', // ここにGame LogsのカテゴリーID
    },

    ROLES: {
        SCOREKEEPER_ROLE_ID: '1524365197987287131', // ここに監督（スコアラー）の役職ID
    },

    // --------------------------------------------------
    // 👥 人数設定の自動計算（上のIS_TEST_MODEによって自動で切り替わります）
    // --------------------------------------------------
    get REQUIRED_PLAYERS() {
        return this.IS_TEST_MODE ? 2 : 8; // 必要人数 (テストなら2、本番なら8)
    },
    
    get TEAM_SIZE() {
        return this.IS_TEST_MODE ? 1 : 4; // 1チームの人数 (テストなら1、本番なら4)
    },

    get REQUIRED_VOID_VOTES() {
        return this.IS_TEST_MODE ? 2 : 5;
    }
};