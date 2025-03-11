import { describe, expect, it, beforeEach } from '@jest/globals';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Make } from '../src/make.js';
enableFetchMocks();
beforeEach(() => fetchMock.resetMocks());

const MAKE_API_KEY = 'api-key';
const MAKE_ZONE = 'make.local';
const MAKE_TEAM = 1;

import * as scenariosMock from './mocks/scenarios.json';
import * as interfaceMock from './mocks/interface.json';
import * as runMock from './mocks/run.json';
import * as runErrorMock from './mocks/run-error.json';
import { MakeError, remap } from '../src/utils.js';

describe('Make SDK', () => {
    const make = new Make(MAKE_API_KEY, MAKE_ZONE);

    it('Should get list of scenarios', async () => {
        fetchMock.mockResponse(req => {
            if (req.url !== 'https://make.local/api/v2/scenarios?teamId=1&pg[limit]=1000')
                throw new Error(`Unmocked HTTP request: ${req.url}`);

            return Promise.resolve({
                body: JSON.stringify(scenariosMock),
                headers: {
                    'content-type': 'application/json',
                },
            });
        });

        expect(await make.scenarios.list(MAKE_TEAM)).toStrictEqual(scenariosMock.scenarios);
    });

    it('Should get scenario interface', async () => {
        fetchMock.mockResponse(req => {
            if (req.url !== 'https://make.local/api/v2/scenarios/1/interface')
                throw new Error(`Unmocked HTTP request: ${req.url}`);

            return Promise.resolve({
                body: JSON.stringify(interfaceMock),
                headers: {
                    'content-type': 'application/json',
                },
            });
        });

        expect(await make.scenarios.interface(1)).toStrictEqual(interfaceMock.interface);
    });

    it('Should run scenario', async () => {
        fetchMock.mockResponse(req => {
            if (req.url !== 'https://make.local/api/v2/scenarios/1/run')
                throw new Error(`Unmocked HTTP request: ${req.url}`);

            return Promise.resolve({
                body: JSON.stringify(runMock),
                headers: {
                    'content-type': 'application/json',
                },
            });
        });

        expect(await make.scenarios.run(1, {})).toStrictEqual(runMock);
    });

    it('Should handle error in scenario run', async () => {
        fetchMock.mockResponse(req => {
            if (req.url !== 'https://make.local/api/v2/scenarios/1/run')
                throw new Error(`Unmocked HTTP request: ${req.url}`);

            return Promise.resolve({
                body: JSON.stringify(runErrorMock),
                status: 400,
                headers: {
                    'content-type': 'application/json',
                },
            });
        });

        try {
            await make.scenarios.run(1, {});
            throw new Error('Should throw an error.');
        } catch (err: unknown) {
            if (!(err instanceof MakeError)) throw new Error('Should throw MakeError.');

            expect(err.name).toBe('MakeError');
            expect(err.message).toBe('Validation failed for 1 parameter(s).');
            expect(err.subErrors).toEqual(["Missing value of required parameter 'number'."]);
            expect(String(err)).toEqual(
                "MakeError: Validation failed for 1 parameter(s).\n - Missing value of required parameter 'number'.",
            );
        }
    });

    it('Should remap inputs to JSON schema', async () => {
        expect(
            remap({
                name: 'wrapper',
                type: 'collection',
                spec: interfaceMock.interface.input,
            }),
        ).toEqual({
            properties: {
                array_of_arrays: {
                    description: 'description',
                    items: {
                        items: {
                            type: 'string',
                        },
                        type: 'array',
                    },
                    type: 'array',
                },
                array_of_collections: {
                    description: 'description',
                    properties: {
                        number: {
                            type: 'number',
                        },
                    },
                    required: [],
                    type: 'object',
                },
                boolean: {
                    type: 'boolean',
                },
                collection: {
                    description: 'description',
                    properties: {
                        text: {
                            type: 'string',
                        },
                    },
                    required: [],
                    type: 'object',
                },
                date: {
                    description: 'description',
                    type: 'string',
                },
                json: {
                    description: 'description',
                    type: 'string',
                },
                number: {
                    default: 15,
                    description: 'required + default',
                    type: 'number',
                },
                text: {
                    type: 'string',
                },
                primitive_array: {
                    description: 'description',
                    items: {
                        type: 'string',
                    },
                    type: 'array',
                },
                select: {
                    enum: ['option 1', 'option 2'],
                    type: 'string',
                },
            },
            required: ['number'],
            type: 'object',
        });
    });
});
