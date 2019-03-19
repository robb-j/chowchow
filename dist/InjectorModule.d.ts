import { ChowChow, Module } from './ChowChow';
export declare class InjectorModule<T extends object> implements Module {
    generator: () => Promise<T> | T;
    env: string[];
    app: ChowChow;
    value: T;
    constructor(generator: () => Promise<T> | T, env?: string[]);
    checkEnvironment(): void;
    setupModule(): Promise<void>;
    clearModule(): void;
    extendExpress(): void;
    extendEndpointContext(): T;
}
