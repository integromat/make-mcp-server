export type ProjectIdResult = { projectId: number } | { error: string };

/**
 * Resolves the Make project ID (formerly team ID) from the environment.
 *
 * `MAKE_PROJECT` is the new name; `MAKE_TEAM` is the legacy name and keeps working unchanged. Both are accepted
 * unconditionally, so the same version behaves identically on every machine. If both are set they must point to
 * the same ID (compared as numbers, so "01" and "1" match).
 */
export function resolveProjectId(env: Record<string, string | undefined>): ProjectIdResult {
    const { MAKE_PROJECT, MAKE_TEAM } = env;
    if (MAKE_PROJECT && MAKE_TEAM && parseInt(MAKE_PROJECT) !== parseInt(MAKE_TEAM)) {
        return { error: 'MAKE_PROJECT and MAKE_TEAM (legacy) are both set but differ. Set only MAKE_PROJECT.' };
    }
    const projectIdEnv = MAKE_PROJECT || MAKE_TEAM;
    if (!projectIdEnv) {
        return { error: 'Please provide MAKE_PROJECT (formerly MAKE_TEAM) environment variable.' };
    }
    return { projectId: parseInt(projectIdEnv) };
}
