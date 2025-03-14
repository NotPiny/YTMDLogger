# Youtube Music Desktop Logger
This is a simple logger designed to run in the background and log the current song playing on the [Youtube Music Desktop App](https://ytmdesktop.app/) using the companion server. The logger is built for linux exclusively but can be easily modified to work on other operating systems (Only OS dependent line is [here](src/index.ts#L32)).

## Setup
1. Clone the repository
2. Install the dependencies
```bash
npm install
```
3. Enable the companion server and authorization in the youtube music desktop app: 
```
Settings (Top right) -> Integrations -> Companion Server => ON
```
and
```
Settings (Top right) -> Integrations -> Companion Server -> Enable companion authorization => ON
```
4. A) Run the logger directly with npm
```bash
npm start
```
4. B) Optionally, you can run the logger in the background using [pm2](https://pm2.keymetrics.io/) (Recommended), You can use the flag in brackets to stop the logger from printing to the console and thus your filesystem.
```bash
npm install -g pm2
pm2 start start_src.sh --name ytmd-logger [--output /dev/null]
```
5. On the youtube music desktop app, you will receive a popup asking for authorization with a code that the logger should print to the console (not important, just for verifying request source). Hit `Allow` and the logger should start logging the current song playing.

## Usage
The majority of configuration is done through the environment variables. The following environment variables are available:
- `NO_LOG` - If set, the logger will not log to the console. (Bit useless but i think it had some sort of use when i made it :P)

- `LOG_EVENTS` - The logger will only log events that match the given types (Comma seperated), Please refer to [src/types.ts](src/types.ts) for the available event types.

- `LOG_TYPE` - Where the logger should log to, Currently only supports `file` (default) and `pantry` (For [Pantry](https://getpantry.cloud/) data storage)

- `PANTRY_ID` - The pantry id to put logs into, Required if `LOG_TYPE` is set to `pantry`

- `PANTRY_BASKET` - The basket to put logs into in the pantry (Defaults to `logs`).

- `PANTRY_LIMIT` - The maximum number of logs to keep in the pantry before it starts to purge the oldest log (Defaults to 15, See Pantry's FAQ).