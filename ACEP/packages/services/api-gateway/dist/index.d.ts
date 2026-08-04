interface ServiceInstance {
    id: string;
    name: string;
    execute: (action: string, payload: unknown) => Promise<unknown>;
}
declare class ServiceRegistry {
    private services;
    register(name: string, instance: ServiceInstance): void;
    get(name: string): ServiceInstance | undefined;
    getAll(): Map<string, ServiceInstance>;
}
declare class ApiGateway {
    private app;
    private registry;
    private port;
    constructor(port?: number);
    private registerServices;
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandler;
    private healthCheck;
    private handleUnderstand;
    private handleDescribe;
    private handleGetProject;
    private handleAnswerQuestion;
    private handleGetBOQ;
    private handleGetCost;
    private handleGetSchedule;
    private handleGetRisks;
    private handleAgentExecute;
    private handlePluginInstall;
    private handlePluginList;
    start(): void;
}
export { ApiGateway, ServiceRegistry, ServiceInstance };
//# sourceMappingURL=index.d.ts.map