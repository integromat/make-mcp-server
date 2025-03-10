export type Scenario = {
    id: number;
    name: string;
    description?: string;
    scheduling: {
        type: string;
    };
};

export type ScenariosServerResponse = {
    scenarios: Scenario[];
};

export type Input = {
    name: string;
    type: string;
    required: boolean;
    description?: string;
};

export type ScenarioInteface = {
    input: Input[];
    output: null;
};

export type ScenarioInterfaceServerResponse = {
    interface: ScenarioInteface;
};

export type ScenarioRunServerResponse = {
    executionId: string;
    outputs: unknown;
};
