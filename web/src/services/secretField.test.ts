import { describe, expect, it } from 'bun:test';
import { SECRET_MASK, secretChange, secretsPatch } from './secretField';

describe('secretChange', () => {
    it('leaves a saved token alone when the dots are untouched', () => {
        expect(secretChange(SECRET_MASK, true)).toEqual({ action: 'keep' });
    });

    it('treats half-erased dots as the sign, not as an instruction', () => {
        expect(secretChange('•••', true)).toEqual({ action: 'keep' });
    });

    it('replaces the token with what is typed, over or beside the dots', () => {
        expect(secretChange('tk_new', true)).toEqual({ action: 'set', token: 'tk_new' });
        expect(secretChange(SECRET_MASK + 'tk_new', true)).toEqual({ action: 'set', token: 'tk_new' });
        expect(secretChange('  tk_new ', false)).toEqual({ action: 'set', token: 'tk_new' });
    });

    it('removes the token when the box is emptied', () => {
        expect(secretChange('', true)).toEqual({ action: 'clear' });
    });

    it('has nothing to do when there was none and none is typed', () => {
        expect(secretChange('', false)).toEqual({ action: 'keep' });
    });
});

describe('secretsPatch', () => {
    it('sends what was typed and names what was emptied', () => {
        expect(secretsPatch({
            password: { action: 'set', token: 'new' },
            'header.x-api-key': { action: 'clear' },
            other: { action: 'keep' },
        })).toEqual({ set: { password: 'new' }, clear: ['header.x-api-key'] });
    });

    it('makes no request when nothing was touched', () => {
        expect(secretsPatch({ password: { action: 'keep' } })).toBeNull();
        expect(secretsPatch({})).toBeNull();
    });
});
