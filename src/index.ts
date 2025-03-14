// import the library
import {CompanionConnector, Settings, StateOutput} from "ytmdesktop-ts-companion";
import pantryLog from "./pantryLog.ts";
import fs from 'node:fs/promises'; // Gotta comply with deno's module system since that's what i use to compile to binary
import fss from 'node:fs';
import { LogEventType } from "./types.ts";

async function log(state: StateOutput, type: LogEventType = 0) {
    if (process.env.NO_LOG) return; // Don't log if the user doesn't want to

    if (process.env.LOG_EVENTS)
        if (!process.env.LOG_EVENTS.split(',').map(Number).includes(type)) return; 

    if (process.env.LOG_TYPE == 'file' || !process.env.LOG_TYPE) {
        const current = await fs.readFile(`${dataPath}/tracker.log`, 'utf8');

        // Don't log metadata if it's already in the file (storage optimization)
        let logMeta = true;

        if (current.includes(`${state.video?.id}`)) logMeta = false;
        let logString = `${Date.now()}|${type}|${state.video?.id}${logMeta ? `|${state.video?.title}|${state.video?.author}|${state.video?.durationSeconds}` : ''}|${state.player?.videoProgress}\n`;
        await fs.appendFile(`${dataPath}/tracker.log`, logString);
    }

    else if (process.env.LOG_TYPE == 'pantry') {
        console.log('Sending log to pantry');
        await pantryLog(state, type)
    };
}

// Uhh windows users, you kinda don't have a home directory or the ability to create symlinks to it, so you'll have to modify and hardcode the path. (Just switch to linux, it's better)
let dataPath = `/home/${process.env.USER}/YTMTracker`;

let version = '0.1.0';
// Define settings (add token if you have one, see bigger example for how this could be done)
const settings: Settings = {
    host: "127.0.0.1",
    port: 9863,
    appId: "ytmtracker",
    appName: "YTMDesktop Tracker",
    appVersion: version
}

// Create a new connector
let connector: CompanionConnector;
try {
    connector = new CompanionConnector(settings);
} catch (error) {
    console.error(error);
    process.exit(1);
}

// define clients for easier access
const restClient = connector.restClient;
const socketClient = connector.socketClient;

let lastKnownState: StateOutput;
let lastVideoChange: number;

socketClient.addStateListener((state: StateOutput): void => {
    // check if the state has changed (compare videoId)
    if (state.video?.id !== lastKnownState?.video?.id) {
        console.log(`State has changed, new video: ${state.video?.title} (${state.video?.author}) [${state.video?.id}]`);
        lastVideoChange = Date.now();

        if (lastKnownState?.video?.durationSeconds != lastKnownState?.player?.videoProgress) 
            log(lastKnownState, LogEventType.Skipped);

        log(state, LogEventType.Initial);
    }

    else if (
        (Date.now() - lastVideoChange > 5000) && // check if the video has changed in the last 5 seconds (to prevent false positives)
        (state.video?.id === lastKnownState?.video?.id) && // don't let it trigger on skip / finish
        (state.player?.videoProgress < lastKnownState?.player?.videoProgress)
    ) {
        console.log("User has skipped back / replayed the song");
    }

    lastKnownState = state;
});

if (!fss.existsSync(dataPath)) {
    fss.mkdirSync(dataPath);

    (async() => {
        await fs.writeFile(`${dataPath}/token.txt`, 'null');
        await fs.writeFile(`${dataPath}/tracker.log`, '');
    })();
}

(async () => {
    try {
        let token: string = await fs.readFile(`${dataPath}/token.txt`, 'utf8');
        if (token != 'null') return connector.setAuthToken(token);
        // if not, try to request one and show it to user.
        const codeResponse = await restClient.getAuthCode();
        console.log("Got new code, please compare it with the code from YTMDesktop: " + codeResponse.code);

        // Request access top YTMDesktop, so it shows the popup to the user.
        const tokenResponse = await restClient.getAuthToken(codeResponse.code);
        token = tokenResponse.token;

        await fs.writeFile(`${dataPath}/token.txt`, token);

        // set token via connector, so it automatically sets it in both clients.
        connector.setAuthToken(token);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();

// connect to the server to receive events
socketClient.connect();