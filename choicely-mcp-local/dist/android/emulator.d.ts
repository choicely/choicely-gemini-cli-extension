import { EmulatorLaunchResult, AVDListResult } from '../schemas.js';
export declare function listAvailableAvds(): Promise<AVDListResult>;
export declare function startEmulator(avdName?: string | null, coldBoot?: boolean, noWindow?: boolean, bootTimeoutSec?: number): Promise<EmulatorLaunchResult>;
//# sourceMappingURL=emulator.d.ts.map