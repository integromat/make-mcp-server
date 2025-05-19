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
    name?: string;
    type: string;
    required?: boolean;
    default?: string | number | boolean | null;
    options?: {
        value: string;
    }[];
    help?: string;
    spec?: Input[] | Input;
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

// New types for scenario creation
export type ScenarioTemplate = {
    id: string;
    name: string;
    description: string;
    category: string;
    modules: ModuleTemplate[];
};

export type ModuleTemplate = {
    id: string;
    name: string;
    type: string;
    category: string;
    description: string;
    parameters?: Record<string, any>;
};

export type CreateScenarioRequest = {
    name: string;
    description?: string;
    teamId: number;
    modules: ModuleConfiguration[];
    connections?: ConnectionConfiguration[];
};

export type ModuleConfiguration = {
    name: string;
    type: string;
    parameters?: Record<string, any>;
    position?: {
        x: number;
        y: number;
    };
};

export type ConnectionConfiguration = {
    from: {
        moduleId: string;
        outputId?: string;
    };
    to: {
        moduleId: string;
        inputId?: string;
    };
};

export type CreateScenarioResponse = {
    scenarioId: number;
    name: string;
    url: string;
};

export type ListTemplatesResponse = {
    templates: ScenarioTemplate[];
};
