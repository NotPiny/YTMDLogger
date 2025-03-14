export enum LogEventType {
    Initial = 0, // Song played naturally (not repeated)
    Repeat = 1, // User repeated the song
    Skipped = 2, // User skipped the song
    Rewind = 3, // User rewinded the song
    Forward = 4, // User skipped forward whilst staying in the same song
}