import { describe, it, expect } from 'bun:test';
import { MarkdownParser } from './MarkdownParser';

/**
 * Characterization tests for MarkdownParser.
 * These document the CURRENT behavior of the parser so any future refactor
 * that changes the output is caught immediately. They are not a spec of what
 * the parser "should" do — they freeze what it does today.
 */
describe('MarkdownParser', () => {
    describe('empty / falsy input', () => {
        it('returns empty string for empty input', () => {
            expect(MarkdownParser.parse('')).toBe('');
        });

        it('returns empty string for whitespace-only that is falsy after coercion', () => {
            // Only the falsy guard returns early; a space is truthy and goes through the pipeline.
            expect(MarkdownParser.parse(' ')).toBe(' ');
        });
    });

    describe('HTML escaping (XSS safety)', () => {
        it('escapes ampersand, angle brackets, quotes and apostrophes', () => {
            expect(MarkdownParser.parse('&')).toBe('&amp;');
            expect(MarkdownParser.parse('a < b > c')).toBe('a &lt; b &gt; c');
            expect(MarkdownParser.parse('"quoted"')).toBe('&quot;quoted&quot;');
            expect(MarkdownParser.parse("it's")).toBe('it&#039;s');
        });

        it('neutralizes a raw script tag by escaping it', () => {
            const out = MarkdownParser.parse('<script>alert(1)</script>');
            expect(out).toContain('&lt;script&gt;');
            expect(out).not.toContain('<script>');
        });
    });

    describe('headers', () => {
        it('parses h1, h2 and h3', () => {
            expect(MarkdownParser.parse('# Title')).toBe('<h1>Title</h1>');
            expect(MarkdownParser.parse('## Title')).toBe('<h2>Title</h2>');
            expect(MarkdownParser.parse('### Title')).toBe('<h3>Title</h3>');
        });
    });

    describe('emphasis', () => {
        it('parses bold with ** and __', () => {
            expect(MarkdownParser.parse('**bold**')).toBe('<strong>bold</strong>');
            expect(MarkdownParser.parse('__bold__')).toBe('<strong>bold</strong>');
        });

        it('parses italic with * and _', () => {
            expect(MarkdownParser.parse('*italic*')).toBe('<em>italic</em>');
            expect(MarkdownParser.parse('_italic_')).toBe('<em>italic</em>');
        });
    });

    describe('inline code and fenced code blocks', () => {
        it('parses inline code', () => {
            expect(MarkdownParser.parse('`code`')).toBe('<code>code</code>');
        });

        it('parses a fenced code block with a language hint', () => {
            const out = MarkdownParser.parse('```js\nconst a = 1;\n```');
            expect(out).toContain('<pre><code class="language-js">');
            expect(out).toContain('const a = 1;');
        });
    });

    describe('lists', () => {
        it('parses an unordered list and merges adjacent items', () => {
            expect(MarkdownParser.parse('- one\n- two'))
                .toBe('<ul><li>one</li><li>two</li></ul>');
        });

        it('parses an ordered list and merges adjacent items', () => {
            expect(MarkdownParser.parse('1. one\n2. two'))
                .toBe('<ol><li>one</li><li>two</li></ol>');
        });
    });

    describe('checkboxes', () => {
        it('parses unchecked and checked checkboxes', () => {
            expect(MarkdownParser.parse('[ ] todo'))
                .toContain('<input type="checkbox" name="task" disabled>');
            expect(MarkdownParser.parse('[x] done'))
                .toContain('<input type="checkbox" name="task" checked disabled>');
        });
    });

    describe('links and images', () => {
        it('parses a link with target=_blank', () => {
            expect(MarkdownParser.parse('[text](https://example.com)'))
                .toBe('<a href="https://example.com" target="_blank">text</a>');
        });

        it('parses an image', () => {
            expect(MarkdownParser.parse('![alt](https://example.com/i.png)'))
                .toBe('<img src="https://example.com/i.png" alt="alt" style="max-width:100%"/>');
        });

        it('collapses a javascript: link to # (XSS-10)', () => {
            expect(MarkdownParser.parse('[x](javascript:alert`1`)'))
                .toBe('<a href="#" target="_blank">x</a>');
        });

        it('collapses a data: image URL to # (XSS-10)', () => {
            expect(MarkdownParser.parse('![x](data:text/html,<b>y</b>)'))
                .toContain('src="#"');
        });

        it('keeps http/mailto and relative URLs', () => {
            expect(MarkdownParser.parse('[m](mailto:a@b.com)'))
                .toBe('<a href="mailto:a@b.com" target="_blank">m</a>');
            expect(MarkdownParser.parse('[r](/local/path)'))
                .toBe('<a href="/local/path" target="_blank">r</a>');
        });
    });

    describe('line breaks', () => {
        it('converts double newline then single newline to <br>', () => {
            expect(MarkdownParser.parse('a\n\nb')).toBe('a<br><br>b');
            expect(MarkdownParser.parse('a\nb')).toBe('a<br>b');
        });
    });

    describe('rules that were silently dropped', () => {
        it('turns "> quote" into a blockquote', () => {
            // The HTML escaping runs first, so the rule has to match the
            // escaped form. Written against the raw ">" it never fired and the
            // quote came out as literal "&gt; quote".
            expect(MarkdownParser.parse('> quoted')).toContain('<blockquote>quoted</blockquote>');
        });

        it('turns "---" into a rule', () => {
            expect(MarkdownParser.parse('---')).toContain('<hr />');
        });
    });

    describe('full document snapshot', () => {
        it('matches the frozen output for a representative document', () => {
            const doc = [
                '# Heading',
                '',
                'Some **bold** and *italic* text with `code`.',
                '',
                '- item 1',
                '- item 2',
                '',
                '[link](https://example.com)',
            ].join('\n');
            expect(MarkdownParser.parse(doc)).toMatchSnapshot();
        });
    });
});
