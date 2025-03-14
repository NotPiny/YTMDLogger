import axios from 'axios';
import { LogEventType } from './types.ts';
import type { StateOutput } from 'ytmdesktop-ts-companion';

const path = `https://getpantry.cloud/apiv1/pantry/${process.env.PANTRY_ID}/basket/${process.env.PANTRY_BASKET ?? 'logs'}`;
const historyLengthLimit = parseInt(process.env.PANTRY_LIMIT ?? '15');

interface PantryBasketData {
    history: PantryHistoryLogEntry[];
}

interface PantryHistoryLogEntry {
    state: {
        id?: string;
        title?: string;
        author?: string;
        cover?: string;
    };
    type: LogEventType;
    time: number;
}

let cacheLoaded = false; // Don't send logs until the cache is loaded to prevent data loss
let cache: PantryBasketData = { // Contains blank data to fix "Cannot set properties of undefined" error
    history: []
};
let queue: PantryHistoryLogEntry[] = [];

(async() => {
    if (!process.env.PANTRY_ID) return;

    try {
        const resp = await axios.get(path);
        cache = resp.data;

        cacheLoaded = true;
        console.log('Pantry log cache loaded');
    } catch (error) {
        console.error(error);
    }
})();

export default async function log(state: StateOutput, type: LogEventType) {
    if (!process.env.PANTRY_ID) throw new Error('Pantry ID not set');
    const logObj = {
        state: {
            id: state?.video?.id,
            title: state?.video?.title,
            author: state?.video?.author,
            cover: state?.video?.thumbnails[0].url,
            duration: state?.video?.durationSeconds
        },
        type,
        time: Date.now()
    }

    queue.push(logObj); // In the event of a failure, we can retry sending the event bundled with the next one

    while (!cacheLoaded) await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for the cache to load before sending logs

    try {
        cache.history = cache?.history?.concat(queue) || []; // Add the queue to the local cache to ensure it doesnt get missed in future requests

        if (cache.history.length >= historyLengthLimit) // We only have 1.44MB of storage, so we need to keep it small and only keep the last 15 logs (realistically, we will probably only display the last 5)
            cache.history = cache.history.slice(-historyLengthLimit);

        await axios.post(path, { // Have to use POST instead of PUT because we want to overwrite the existing data
            history: cache.history
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        queue = []; // Success, reset the queue
    } catch (error) {
        console.error(error); // Log the error and hope for it to work next time
    }
}