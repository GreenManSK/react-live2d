export type ITicker = {
    // Set time for last update
    updateTime(): void;
    // Return time since last update
    getDeltaTime(): number;
};
