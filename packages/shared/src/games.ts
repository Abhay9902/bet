export const GAME_IDS = ['aviator', 'ludo', 'chicken-road', 'dice'] as const;

export type GameId = (typeof GAME_IDS)[number];
