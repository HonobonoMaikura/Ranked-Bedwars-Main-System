// utils/getNextGameId.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const idFilePath = path.join(__dirname, '../game_ids.json');

export function getAndIncrementNextGameId() {
    let nextNumber = 1;
    
    if (fs.existsSync(idFilePath)) {
        const idData = JSON.parse(fs.readFileSync(idFilePath, 'utf-8'));
        nextNumber = idData.nextQueue1Number || 1;
    }
    
    fs.writeFileSync(idFilePath, JSON.stringify({ nextQueue1Number: nextNumber + 1 }, null, 2));
    
    return {
        textId: `#A${String(nextNumber).padStart(4, '0')}`,
        channelName: `game-a${String(nextNumber).padStart(4, '0')}`
    };
}