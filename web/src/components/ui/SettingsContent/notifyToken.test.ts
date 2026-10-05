import { describe, expect, it } from 'bun:test';
import { TOKEN_MASK, tokenChange } from './notifyToken';

describe('tokenChange', () => {
    it('leaves a saved token alone when the dots are untouched', () => {
        expect(tokenChange(TOKEN_MASK, true)).toEqual({ action: 'keep' });
    });

    it('treats half-erased dots as the sign, not as an instruction', () => {
        expect(tokenChange('•••', true)).toEqual({ action: 'keep' });
    });

    it('replaces the token with what is typed, over or beside the dots', () => {
        expect(tokenChange('tk_new', true)).toEqual({ action: 'set', token: 'tk_new' });
        expect(tokenChange(TOKEN_MASK + 'tk_new', true)).toEqual({ action: 'set', token: 'tk_new' });
        expect(tokenChange('  tk_new ', false)).toEqual({ action: 'set', token: 'tk_new' });
    });

    it('removes the token when the box is emptied', () => {
        expect(tokenChange('', true)).toEqual({ action: 'clear' });
    });

    it('has nothing to do when there was none and none is typed', () => {
        expect(tokenChange('', false)).toEqual({ action: 'keep' });
    });
});
