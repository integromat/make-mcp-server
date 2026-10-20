import { describe, expect, it } from '@jest/globals';
import { resolveProjectId } from '../src/project-id.js';

describe('resolveProjectId', () => {
    it('reads MAKE_PROJECT', () => {
        expect(resolveProjectId({ MAKE_PROJECT: '42' })).toStrictEqual({ projectId: 42 });
    });

    it('keeps reading the legacy MAKE_TEAM', () => {
        expect(resolveProjectId({ MAKE_TEAM: '7' })).toStrictEqual({ projectId: 7 });
    });

    it('accepts both when they match', () => {
        expect(resolveProjectId({ MAKE_PROJECT: '5', MAKE_TEAM: '5' })).toStrictEqual({ projectId: 5 });
        expect(resolveProjectId({ MAKE_PROJECT: '05', MAKE_TEAM: '5' })).toStrictEqual({ projectId: 5 });
    });

    it('rejects both when they differ', () => {
        const result = resolveProjectId({ MAKE_PROJECT: '5', MAKE_TEAM: '6' });
        expect(result).toStrictEqual({
            error: 'MAKE_PROJECT and MAKE_TEAM (legacy) are both set but differ. Set only MAKE_PROJECT.',
        });
    });

    it('treats an empty MAKE_PROJECT as unset (Smithery passes both keys)', () => {
        expect(resolveProjectId({ MAKE_PROJECT: '', MAKE_TEAM: '9' })).toStrictEqual({ projectId: 9 });
        expect(resolveProjectId({ MAKE_PROJECT: '9', MAKE_TEAM: '' })).toStrictEqual({ projectId: 9 });
    });

    it('fails when neither is set', () => {
        expect(resolveProjectId({})).toStrictEqual({
            error: 'Please provide MAKE_PROJECT (formerly MAKE_TEAM) environment variable.',
        });
    });
});
