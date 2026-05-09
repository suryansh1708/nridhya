/**
 * Unit tests for the Nridhya Static Site Generator
 * Run with: npm test
 */

const {
    hashContent,
    needsRebuild,
    injectPartials,
    minifyCSS,
    minifyHTML,
    processInParallel,
} = require('./build.js');

describe('hashContent', () => {
    test('generates consistent hash for same content', () => {
        const content = 'Hello World';
        const hash1 = hashContent(content);
        const hash2 = hashContent(content);
        expect(hash1).toBe(hash2);
    });

    test('generates different hash for different content', () => {
        const hash1 = hashContent('Hello');
        const hash2 = hashContent('World');
        expect(hash1).not.toBe(hash2);
    });

    test('returns 8 character hash', () => {
        const hash = hashContent('test content');
        expect(hash).toHaveLength(8);
    });

    test('handles empty string', () => {
        const hash = hashContent('');
        expect(hash).toHaveLength(8);
    });

    test('handles special characters', () => {
        const hash = hashContent('<html>{{> partial}}</html>');
        expect(hash).toHaveLength(8);
    });
});

describe('needsRebuild', () => {
    test('returns true for new file', () => {
        const cache = {};
        const result = needsRebuild('/path/to/file.html', 'content', cache);
        expect(result).toBe(true);
    });

    test('returns false for unchanged file', () => {
        const cache = {};
        needsRebuild('/path/to/file.html', 'content', cache);
        const result = needsRebuild('/path/to/file.html', 'content', cache);
        expect(result).toBe(false);
    });

    test('returns true for changed file', () => {
        const cache = {};
        needsRebuild('/path/to/file.html', 'old content', cache);
        const result = needsRebuild('/path/to/file.html', 'new content', cache);
        expect(result).toBe(true);
    });

    test('updates cache with hash and timestamp', () => {
        const cache = {};
        needsRebuild('/path/to/file.html', 'content', cache);
        expect(cache['/path/to/file.html']).toBeDefined();
        expect(cache['/path/to/file.html'].hash).toBeDefined();
        expect(cache['/path/to/file.html'].timestamp).toBeDefined();
    });
});

describe('injectPartials', () => {
    const partials = {
        'nav': '<nav>Navigation</nav>',
        'footer': '<footer>Footer</footer>',
        'nested': 'Before {{> nav}} After',
    };

    test('injects single partial', () => {
        const html = '<body>{{> nav}}</body>';
        const result = injectPartials(html, partials);
        expect(result).toBe('<body><nav>Navigation</nav></body>');
    });

    test('injects multiple partials', () => {
        const html = '{{> nav}}<main>Content</main>{{> footer}}';
        const result = injectPartials(html, partials);
        expect(result).toBe('<nav>Navigation</nav><main>Content</main><footer>Footer</footer>');
    });

    test('handles nested partials', () => {
        const html = '{{> nested}}';
        const result = injectPartials(html, partials);
        expect(result).toBe('Before <nav>Navigation</nav> After');
    });

    test('preserves unmatched partial references', () => {
        const html = '{{> nonexistent}}';
        const result = injectPartials(html, partials);
        expect(result).toBe('{{> nonexistent}}');
    });

    test('handles whitespace in partial syntax', () => {
        const html = '{{>  nav  }}';
        const result = injectPartials(html, partials);
        expect(result).toBe('<nav>Navigation</nav>');
    });

    test('handles partial names with hyphens', () => {
        const partialsWithHyphen = { 'contact-strip': '<div>Contact</div>' };
        const html = '{{> contact-strip}}';
        const result = injectPartials(html, partialsWithHyphen);
        expect(result).toBe('<div>Contact</div>');
    });

    test('throws error on excessive nesting', () => {
        const circularPartials = {
            'a': '{{> b}}',
            'b': '{{> c}}',
            'c': '{{> d}}',
            'd': '{{> e}}',
            'e': '{{> f}}',
            'f': '{{> g}}',
            'g': '{{> h}}',
            'h': '{{> i}}',
            'i': '{{> j}}',
            'j': '{{> k}}',
            'k': '{{> l}}',
            'l': 'end',
        };
        expect(() => {
            injectPartials('{{> a}}', circularPartials);
        }).toThrow('Partial nesting depth exceeded 10');
    });
});

describe('minifyCSS', () => {
    test('removes comments', () => {
        const css = '/* comment */ body { color: red; }';
        const result = minifyCSS(css);
        expect(result).not.toContain('comment');
    });

    test('collapses whitespace', () => {
        const css = 'body  {   color:   red;   }';
        const result = minifyCSS(css);
        expect(result).toBe('body{color:red}');
    });

    test('removes space around symbols', () => {
        const css = 'body { color : red ; }';
        const result = minifyCSS(css);
        expect(result).toBe('body{color:red}');
    });

    test('removes trailing semicolons before closing braces', () => {
        const css = 'body { color: red; }';
        const result = minifyCSS(css);
        expect(result).toBe('body{color:red}');
    });

    test('removes units from zero values', () => {
        const css = 'body { margin: 0px; padding: 0rem; }';
        const result = minifyCSS(css);
        expect(result).toContain(':0');
        expect(result).not.toContain('0px');
    });

    test('shortens hex colors', () => {
        const css = 'body { color: #ffffff; }';
        const result = minifyCSS(css);
        expect(result).toBe('body{color:#fff}');
    });

    test('preserves important declarations', () => {
        const css = 'body { color: red !important; }';
        const result = minifyCSS(css);
        expect(result).toContain('!important');
    });

    test('handles empty input', () => {
        const result = minifyCSS('');
        expect(result).toBe('');
    });

    test('handles multiline CSS', () => {
        const css = `
            body {
                color: red;
                background: blue;
            }
        `;
        const result = minifyCSS(css);
        expect(result).toBe('body{color:red;background:blue}');
    });
});

describe('minifyHTML', () => {
    test('removes HTML comments', () => {
        const html = '<!-- comment --><div>Content</div>';
        const result = minifyHTML(html);
        expect(result).not.toContain('comment');
        expect(result).toBe('<div>Content</div>');
    });

    test('removes empty lines', () => {
        const html = '<div>\n\n\n</div>';
        const result = minifyHTML(html);
        expect(result).not.toContain('\n\n');
    });

    test('removes whitespace between tags', () => {
        const html = '<div>  </div>  <span>  </span>';
        const result = minifyHTML(html);
        expect(result).toBe('<div></div><span></span>');
    });

    test('collapses multiple spaces', () => {
        const html = '<div>Hello    World</div>';
        const result = minifyHTML(html);
        expect(result).toBe('<div>Hello World</div>');
    });

    test('handles empty input', () => {
        const result = minifyHTML('');
        expect(result).toBe('');
    });

    test('preserves single spaces in text', () => {
        const html = '<p>Hello World</p>';
        const result = minifyHTML(html);
        expect(result).toBe('<p>Hello World</p>');
    });
});

describe('processInParallel', () => {
    test('processes items in parallel', async () => {
        const items = [1, 2, 3, 4, 5];
        const processor = async (x) => x * 2;
        const results = await processInParallel(items, processor, 2);
        expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    test('handles empty array', async () => {
        const results = await processInParallel([], async (x) => x);
        expect(results).toEqual([]);
    });

    test('respects batch size', async () => {
        const callOrder = [];
        const items = [1, 2, 3, 4, 5];
        const processor = async (x) => {
            callOrder.push(x);
            return x;
        };
        await processInParallel(items, processor, 2);
        expect(callOrder).toHaveLength(5);
    });

    test('handles async errors', async () => {
        const items = [1, 2, 3];
        const processor = async (x) => {
            if (x === 2) throw new Error('Test error');
            return x;
        };
        await expect(processInParallel(items, processor, 3)).rejects.toThrow('Test error');
    });
});

describe('Integration Tests', () => {
    test('full partial injection with minification', () => {
        const partials = {
            'head': '<head><title>Test</title></head>',
            'nav': '<nav class="main">Nav</nav>',
        };
        const html = `
            <!DOCTYPE html>
            <html>
            {{> head}}
            <body>
                {{> nav}}
                <!-- Main content -->
                <main>Hello    World</main>
            </body>
            </html>
        `;
        
        let result = injectPartials(html, partials);
        result = minifyHTML(result);
        
        expect(result).toContain('<head><title>Test</title></head>');
        expect(result).toContain('<nav class="main">Nav</nav>');
        expect(result).not.toContain('{{>');
        expect(result).not.toContain('Main content');
    });

    test('CSS minification produces valid output', () => {
        const css = `
            :root {
                --primary: #BA0001;
                --gold: #F3CF91;
            }
            
            /* Navigation styles */
            .nav {
                background: var(--primary);
                padding: 0px 0rem;
            }
            
            .nav a {
                color: #ffffff;
                text-decoration: none;
            }
        `;
        
        const result = minifyCSS(css);
        
        expect(result).toContain(':root{--primary:#BA0001;--gold:#F3CF91}');
        expect(result).toContain('.nav{background:var(--primary)');
        expect(result).toContain('.nav a{color:#fff;text-decoration:none}');
    });
});
