import { describe, expect, it } from 'bun:test';
import { SECRET_MASK, secretChange } from './secretField';

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
