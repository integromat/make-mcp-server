import { Input } from './types.js';

export function isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const PRIMITIVE_TYPE_MAP = {
    text: 'string',
    number: 'number',
    boolean: 'boolean',
    date: 'string',
    json: 'string',
};

export class MakeError extends Error {
    statusCode?: number;
    subErrors?: string[];

    constructor(message: string, statusCode?: number) {
        super(message);

        this.name = 'MakeError';
        this.statusCode = statusCode;
    }

    toString() {
        return `${this.name}: ${this.message}` + (this.subErrors?.length ? `\n - ${this.subErrors.join('\n - ')}` : '');
    }
}

export async function createMakeError(res: Response): Promise<MakeError> {
    try {
        const body: unknown = await res.clone().json();
        if (isObject(body) && 'message' in body && typeof body.message === 'string') {
            const message = 'detail' in body && typeof body.detail === 'string' ? body.detail : body.message;
            const err = new MakeError(message, res.status);
            if ('suberrors' in body && Array.isArray(body.suberrors)) {
                err.subErrors = body.suberrors
                    .filter(suberr => {
                        return isObject(suberr) && 'message' in suberr && typeof suberr.message === 'string';
                    })
                    .map(suberr => {
                        return suberr.message;
                    });
            }
            return err;
        }
    } catch (err: unknown) {
        // Do nothing.
    }

    return new MakeError(res.statusText, res.status);
}

function noEmpty(text: string | undefined): string | undefined {
    if (!text) return undefined;
    return text;
}

export function remap(field: Input): unknown {
    switch (field.type) {
        case 'collection':
            const required: string[] = [];
            const properties: unknown = (Array.isArray(field.spec) ? field.spec : []).reduce((object, subField) => {
                if (!subField.name) return object;
                if (subField.required) required.push(subField.name);

                return Object.defineProperty(object, subField.name, {
                    enumerable: true,
                    value: remap(subField),
                });
            }, {});

            return {
                type: 'object',
                description: noEmpty(field.help),
                properties,
                required,
            };
        case 'array':
            return {
                type: 'array',
                description: noEmpty(field.help),
                items:
                    field.spec &&
                    remap(
                        Array.isArray(field.spec)
                            ? {
                                  type: 'collection',
                                  spec: field.spec,
                              }
                            : field.spec,
                    ),
            };
        case 'select':
            return {
                type: 'string',
                description: noEmpty(field.help),
                enum: (field.options || []).map(option => option.value),
            };
        default:
            return {
                type: PRIMITIVE_TYPE_MAP[field.type as keyof typeof PRIMITIVE_TYPE_MAP],
                default: field.default != '' && field.default != null ? field.default : undefined,
                description: noEmpty(field.help),
            };
    }
}
