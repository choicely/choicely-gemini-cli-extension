type Logger = (message: string) => void;
export interface InstallOptions {
    installEmulator?: boolean;
}
export declare function installLocalDependencies(log?: Logger, options?: InstallOptions): Promise<void>;
export {};
//# sourceMappingURL=installer.d.ts.map