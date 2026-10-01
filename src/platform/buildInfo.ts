interface BuildInfo { version: string; revision: string; modified: boolean; builtAt: string }
declare const __BUILD_INFO__: BuildInfo;

/** Kept in settings so a player can identify the actual runnable version. */
export const buildInfo: BuildInfo = __BUILD_INFO__;
