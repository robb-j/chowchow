"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class InjectorModule {
    constructor(generator, env = []) {
        this.generator = generator;
        this.env = env;
        this.app = null;
        this.value = null;
    }
    checkEnvironment() {
        let missing = this.env.filter(name => process.env[name] === undefined);
        if (missing.length > 0) {
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }
    }
    async setupModule() {
        this.value = await this.generator();
    }
    clearModule() {
        delete this.value;
    }
    extendExpress() { }
    extendEndpointContext() {
        return this.value;
    }
}
exports.InjectorModule = InjectorModule;
//# sourceMappingURL=InjectorModule.js.map