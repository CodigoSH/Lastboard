import { describe, it, expect } from 'bun:test';
import { body, stepItem, UpdateModalData, TimelineStep, StepStatus, UpdatePhase } from './UpdateModal.template';

/**
 * The timeline is the part of this modal that carries information: which step
 * is running, which ones are done, which one failed and which were never
 * attempted. These tests pin that mapping — a step must never look completed
 * unless the backend said so.
 */

const STEP_IDS = ['download', 'signature', 'checksum', 'extract', 'install', 'restart'];

const steps = (statuses: Partial<Record<string, StepStatus>>): TimelineStep[] =>
    STEP_IDS.map(id => ({ id, label: id, status: statuses[id] || 'pending' }));

const data = (over: Partial<UpdateModalData> = {}): UpdateModalData => ({
    phase: 'available' as UpdatePhase,
    currentVersion: 'v1.6.2',
    latestVersion: 'v1.7.0',
    isDocker: false,
    steps: steps({}),
    errorText: '',
    detailText: '',
    changelogUrl: 'https://example.test/releases',
    text: {
        title: 'Software update',
        close: 'Close',
        badge: 'New update!',
        install: 'Download & install',
        changelog: 'Changelog',
        intro: 'It downloads, verifies and installs.',
        runningHint: "Don't close this window.",
        restarting: 'Waiting for the new version…',
        done: 'Now running v1.7.0.',
        retry: 'Retry',
        dockerTitle: 'Docker mode',
        dockerBody: 'Managed by Docker.',
    },
    ...over,
});

describe('UpdateModal template', () => {
    it('offers the install action and both versions before starting', () => {
        const out = body(data());
        expect(out).toContain('id="btn-install"');
        expect(out).toContain('v1.6.2');
        expect(out).toContain('v1.7.0');
        expect(out).toContain('It downloads, verifies and installs.');
        expect(out).toMatchSnapshot();
    });

    it('renders one timeline entry per step, pending by default', () => {
        const out = body(data());
        for (const id of STEP_IDS) {
            expect(out).toContain(`data-step="${id}"`);
        }
        expect(out.match(/class="tl-step is-pending"/g)).toHaveLength(STEP_IDS.length);
    });

    // The close button and the actions are what make an update abandonable.
    // While it runs there is no cancel endpoint and no way to undo half a binary
    // swap, so neither may be offered.
    it('offers no way out while the update is running', () => {
        const out = body(data({ phase: 'running', steps: steps({ download: 'running' }) }));
        expect(out).not.toContain('id="modal-close"');
        expect(out).not.toContain('id="btn-install"');
        expect(out).not.toContain('id="btn-dismiss"');
        expect(out).toContain('aria-busy="true"');
    });

    it('keeps the dialog locked while the server restarts', () => {
        const out = body(data({ phase: 'restarting', steps: steps({ restart: 'running' }) }));
        expect(out).not.toContain('id="modal-close"');
        expect(out).toContain('Waiting for the new version…');
    });

    it('marks the failed step and leaves the later ones untouched', () => {
        const base = data();
        const out = body({
            ...base,
            phase: 'error',
            steps: steps({ download: 'ok', signature: 'ok', checksum: 'error' }),
            errorText: 'Integrity check failed',
            detailText: 'The previous version was restored.',
            // The component resolves the headline per phase before rendering.
            text: { ...base.text, badge: 'Update failed' },
        });

        expect(out).toContain('badge--error');
        expect(out).toContain('Update failed');

        expect(out).toContain('class="tl-step is-error" data-step="checksum"');
        expect(out).toContain('class="tl-step is-pending" data-step="extract"');
        expect(out).toContain('class="tl-step is-pending" data-step="install"');
        expect(out).toContain('Integrity check failed');
        expect(out).toContain('The previous version was restored.');
        // A failed run can be closed or retried.
        expect(out).toContain('id="btn-retry"');
        expect(out).toContain('id="btn-dismiss"');
        expect(out).toMatchSnapshot();
    });

    it('shows a skipped step as skipped, never as completed', () => {
        const out = stepItem({ id: 'signature', label: 'Verify signature', status: 'skipped', note: 'No signing key' });
        expect(out).toContain('is-skipped');
        expect(out).not.toContain('is-ok');
        expect(out).toContain('No signing key');
    });

    it('escapes text coming from the server', () => {
        const out = body(data({
            phase: 'error',
            latestVersion: '<img src=x onerror=alert(1)>',
            errorText: '<script>alert(1)</script>',
        }));
        expect(out).not.toContain('<script>');
        expect(out).not.toContain('<img src=x');
        expect(out).toContain('&lt;script&gt;');
    });

    it('offers no install button under Docker, only the changelog', () => {
        const out = body(data({ isDocker: true }));
        expect(out).not.toContain('id="btn-install"');
        expect(out).toContain('Managed by Docker.');
        expect(out).toContain('https://example.test/releases');
        // The timeline describes a binary swap this deployment never performs.
        expect(out).not.toContain('data-step="install"');
    });
});
