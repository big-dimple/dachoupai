import type {BuildInfo} from './buildMetadata';
export {formatBuildInfo} from './buildMetadata';
export type {BuildInfo} from './buildMetadata';
declare const __BUILD_INFO__: BuildInfo;

/** Kept in settings so a player can identify the actual runnable version. */
export const buildInfo: BuildInfo = __BUILD_INFO__;
