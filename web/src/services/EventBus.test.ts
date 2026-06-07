import { describe, it, expect } from 'bun:test';
import { eventBus, EVENTS } from './EventBus';

/**
 * Characterization tests for the EventBus pub/sub.
 * Freezes the emit / on / off contract used across the UI.
 */
describe('EventBus', () => {
    it('delivers emitted detail to a subscriber', () => {
        let received: any = null;
        const handler = (e: CustomEvent) => { received = e.detail; };

        eventBus.on('test:event', handler);
        eventBus.emit('test:event', { value: 42 });
        eventBus.off('test:event', handler);

        expect(received).toEqual({ value: 42 });
    });

    it('emits with undefined detail when none is passed', () => {
        let called = false;
        let detail: any = 'sentinel';
        const handler = (e: CustomEvent) => { called = true; detail = e.detail; };

        eventBus.on('test:no-detail', handler);
        eventBus.emit('test:no-detail');
        eventBus.off('test:no-detail', handler);

        expect(called).toBe(true);
        expect(detail).toBeNull();
    });

    it('stops delivering after off()', () => {
        let count = 0;
        const handler = () => { count++; };

        eventBus.on('test:off', handler);
        eventBus.emit('test:off');
        eventBus.off('test:off', handler);
        eventBus.emit('test:off');

        expect(count).toBe(1);
    });

    it('exposes the documented event name constants', () => {
        expect(EVENTS.SHOW_CONFIRMATION).toBe('lastboard:show-confirmation');
        expect(EVENTS.SHOW_PASSWORD_CONFIRM).toBe('lastboard:show-password-confirm');
        expect(EVENTS.SHOW_WIDGET_CONFIG).toBe('lastboard:show-widget-config');
        expect(EVENTS.NOTIFY).toBe('lastboard:notify');
    });
});
