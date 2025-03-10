import { Input } from './types.js';

export function isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const TYPE_MAP = {
    text: 'string',
    number: 'number',
    boolean: 'boolean',
};

export class MakeError extends Error {
    detail?: string;
    statusCode?: number;

    constructor(message: string, statusCode?: number, detail?: string) {
        super(message);

        this.name = 'HTTPError';
        this.detail = detail;
        this.statusCode = statusCode;
    }
}

export async function createMakeError(res: Response): Promise<MakeError> {
    try {
        const err: unknown = await res.clone().json();
        if (isObject(err) && 'message' in err && typeof err.message === 'string') {
            if ('detail' in err && typeof err.detail === 'string') {
                return new MakeError(err.message, res.status, err.detail);
            }
            return new MakeError(err.message, res.status);
        }
    } catch (err: unknown) {
        // Do nothing.
    }
    try {
        return new MakeError(res.statusText, res.status, await res.clone().text());
    } catch (err: unknown) {
        return new MakeError(res.statusText, res.status);
    }
}

export function remap(forman: Input[]) {
    return {
        type: 'object',
        properties: forman.reduce((object, field) => {
            Object.defineProperty(object, field.name, {
                enumerable: true,
                value: {
                    type: TYPE_MAP[field.type as keyof typeof TYPE_MAP],
                    descriptions: field.description,
                },
            });
            return object;
        }, {}),
        required: forman.filter(input => input.required).map(input => input.name),
    };
}
