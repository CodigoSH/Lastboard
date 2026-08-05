import { describe, it, expect, mock, beforeEach } from 'bun:test';

/**
 * The store turns a stream of backend events into what the timeline shows. The
 * risk it carries is a step looking finished when it never ran, so these tests
 * follow the states an update actually goes through — including the two the UI
 * cannot observe on its own: a failure part-way, and the restart.
 */

type Emit = (event: any) => void;

let performImpl: (assetUrl: string, onEvent: Emit) => Promise<void> = async () => { };
let versionImpl: () => Promise<string> = async () => 'v1.6.2';

mock.module('../services/UpdateService', () => ({
    UPDATE_STEPS: ['download', 'signature', 'checksum', 'extract', 'install', 'restart'],
    updateService: {
        perform: (assetUrl: string, onEvent: Emit) => performImpl(assetUrl, onEvent),
        runningVersion: () => versionImpl(),
        check: async () => ({}),
    },
}));

const { updateStore } = await import('./updateStore');

const INFO = {
    available: true,
    current_version: 'v1.6.2',
    latest_version: 'v1.7.0',
    asset_url: 'https://git.codigosh.com/CodigoSH/Lastboard/releases/download/v1.7.0/x.tar.gz',
    is_docker: false,
};

beforeEach(() => {
    updateStore.reset();
    updateStore.setInfo(INFO as any);
    versionImpl = async () => 'v1.6.2';
});

describe('updateStore', () => {
    it('starts on the available phase once a check found something', () => {
        expect(updateStore.getState().phase).toBe('available');
        expect(updateStore.getState().steps.download).toBe('pending');
    });

    it('marks each step as the backend reports it', async () => {
        performImpl = async (_url, emit) => {
            emit({ step: 'download', status: 'running' });
            emit({ step: 'download', status: 'ok' });
            emit({ step: 'signature', status: 'skipped' });
            emit({ step: 'checksum', status: 'ok' });
            emit({ step: 'extract', status: 'ok' });
            emit({ step: 'install', status: 'ok' });
            emit({ step: 'restart', status: 'running' });
        };
        versionImpl = async () => 'v1.7.0';

        await updateStore.start(INFO.asset_url);

        const state = updateStore.getState();
        expect(state.steps.download).toBe('ok');
        expect(state.steps.signature).toBe('skipped');
        expect(state.steps.install).toBe('ok');
        expect(state.phase).toBe('done');
    });

    // The whole point of the timeline: a failure must stop it where it happened
    // and leave everything after it visibly untouched.
    it('stops at the failing step and leaves the later ones pending', async () => {
        performImpl = async (_url, emit) => {
            emit({ step: 'download', status: 'ok' });
            emit({ step: 'signature', status: 'ok' });
            emit({ step: 'checksum', status: 'error', error: 'notifier.update_checksum_failed' });
        };

        await updateStore.start(INFO.asset_url);

        const state = updateStore.getState();
        expect(state.phase).toBe('error');
        expect(state.errorKey).toBe('notifier.update_checksum_failed');
        expect(state.steps.checksum).toBe('error');
        expect(state.steps.extract).toBe('pending');
        expect(state.steps.install).toBe('pending');
        expect(state.steps.restart).toBe('pending');
    });

    it('keeps the rollback outcome of a failed install', async () => {
        performImpl = async (_url, emit) => {
            emit({ step: 'install', status: 'error', error: 'notifier.update_install_failed', detail: 'notifier.update_rollback_failed' });
        };

        await updateStore.start(INFO.asset_url);

        expect(updateStore.getState().errorKey).toBe('notifier.update_install_failed');
        expect(updateStore.getState().errorDetail).toBe('notifier.update_rollback_failed');
    });

    // The old binary answers for a moment after replying, so "the server is up"
    // is not enough — only a different version means the new build is serving.
    it('does not finish the restart until a different version answers', async () => {
        let answers = ['v1.6.2', 'v1.6.2', 'v1.7.0'];
        versionImpl = async () => answers.shift() || 'v1.7.0';

        performImpl = async (_url, emit) => {
            emit({ step: 'install', status: 'ok' });
            emit({ step: 'restart', status: 'running' });
        };

        const run = updateStore.start(INFO.asset_url);
        // Still on the old version: the restart cannot be green yet.
        expect(updateStore.getState().phase).toBe('restarting');
        expect(updateStore.getState().steps.restart).toBe('running');

        await run;

        expect(updateStore.getState().phase).toBe('done');
        expect(updateStore.getState().steps.restart).toBe('ok');
    }, 15000);

    it('reports a rejection that happened before the update began', async () => {
        performImpl = async () => {
            throw new Error('notifier.update_unprivileged');
        };

        await updateStore.start(INFO.asset_url);

        expect(updateStore.getState().phase).toBe('error');
        expect(updateStore.getState().errorKey).toBe('notifier.update_unprivileged');
        expect(updateStore.getState().steps.download).toBe('pending');
    });

    it('falls back to a generic failure for an unrecognised error', async () => {
        performImpl = async () => {
            throw new Error('TypeError: failed to fetch');
        };

        await updateStore.start(INFO.asset_url);

        expect(updateStore.getState().errorKey).toBe('notifier.update_failed');
    });

    it('refuses to be reset while an update is in flight', async () => {
        let release: () => void = () => { };
        performImpl = () => new Promise<void>(resolve => { release = resolve; });

        const run = updateStore.start(INFO.asset_url);
        expect(updateStore.isBusy()).toBe(true);

        updateStore.reset();
        expect(updateStore.getState().phase).toBe('running');

        versionImpl = async () => 'v1.7.0';
        release();
        await run;
    }, 15000);
});
