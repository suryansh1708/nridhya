/**
 * Nridhya Static Site Generator
 * Professional-grade build system with:
 * - Parallel processing
 * - Incremental builds (caching)
 * - Asset hashing for cache busting
 * - Detailed build statistics
 * - Validation and error handling
 */

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const matter = require('gray-matter');
const { marked } = require('marked');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    CONTENT_DIR: path.join(__dirname, '../content'),
    SRC_DIR: path.join(__dirname, 'src'),
    DIST_DIR: path.join(__dirname, '../dist'),
    CACHE_FILE: path.join(__dirname, '../.build-cache.json'),
    ENABLE_CACHE: true,
    MAX_PARALLEL: 10,
    
    // GitHub Pages specific
    SITE_URL: 'https://nridhya.com', // Change this to your GitHub Pages URL
    GENERATE_SITEMAP: true,
    GENERATE_404: true,
};

const PARTIALS_DIR = path.join(CONFIG.CONTENT_DIR, 'partials');

// Build statistics
const stats = {
    startTime: 0,
    endTime: 0,
    files: { processed: 0, cached: 0, failed: 0 },
    sizes: { original: 0, minified: 0 },
    timings: {},
};

// Cache for incremental builds
let buildCache = {};

/**
 * Generate content hash for cache invalidation
 */
function hashContent(content) {
    return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

/**
 * Load build cache from disk
 */
async function loadCache() {
    if (!CONFIG.ENABLE_CACHE) return {};
    try {
        const data = await fs.readFile(CONFIG.CACHE_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

/**
 * Save build cache to disk
 */
async function saveCache(cache) {
    if (!CONFIG.ENABLE_CACHE) return;
    await fs.writeFile(CONFIG.CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Check if file needs rebuilding based on content hash
 */
function needsRebuild(filePath, content, cache) {
    if (!CONFIG.ENABLE_CACHE) return true;
    const hash = hashContent(content);
    const cached = cache[filePath];
    if (cached && cached.hash === hash) {
        return false;
    }
    cache[filePath] = { hash, timestamp: Date.now() };
    return true;
}

/**
 * Load all partial files in parallel
 */
async function loadPartials() {
    const startTime = performance.now();
    const partials = {};
    
    try {
        const files = await fs.readdir(PARTIALS_DIR);
        const partialFiles = files.filter(f => f.startsWith('_') && f.endsWith('.html'));
        
        // Load all partials in parallel
        const contents = await Promise.all(
            partialFiles.map(async (file) => {
                const content = await fs.readFile(path.join(PARTIALS_DIR, file), 'utf8');
                return { name: file.slice(1, -5), content };
            })
        );
        
        contents.forEach(({ name, content }) => {
            partials[name] = content;
        });
        
        stats.timings.partials = Math.round(performance.now() - startTime);
        console.log(`  Loaded ${Object.keys(partials).length} partials in ${stats.timings.partials}ms`);
    } catch (e) {
        console.log('  No partials directory found');
    }
    
    return partials;
}

/**
 * Inject partials with cycle detection
 */
function injectPartials(html, partials, visited = new Set(), depth = 0) {
    if (depth > 10) {
        throw new Error('Partial nesting depth exceeded 10 - possible circular reference');
    }
    
    const partialRegex = /\{\{>\s*(\w[\w-]*)\s*\}\}/g;
    const errors = [];
    
    const result = html.replace(partialRegex, (match, name) => {
        if (visited.has(name)) {
            errors.push(`Circular reference detected: ${name}`);
            return match;
        }
        if (!partials[name]) {
            errors.push(`Partial not found: ${name}`);
            return match;
        }
        
        visited.add(name);
        const expanded = injectPartials(partials[name], partials, new Set(visited), depth + 1);
        visited.delete(name);
        return expanded;
    });
    
    if (errors.length > 0) {
        errors.forEach(e => console.warn(`  Warning: ${e}`));
    }
    
    return result;
}

/**
 * Minify CSS with better compression
 */
function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')     // Remove comments
        .replace(/\s+/g, ' ')                  // Collapse whitespace
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')  // Remove space around symbols
        .replace(/;}/g, '}')                   // Remove last semicolon
        .replace(/\s*!important/g, '!important')
        .replace(/:\s*0(px|em|rem|%)/g, ':0')  // Remove units from zero values
        .replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/g, '#$1$2$3') // Shorten colors
        .trim();
}

/**
 * Minify HTML
 */
function minifyHTML(html) {
    return html
        .replace(/<!--[\s\S]*?-->/g, '')      // Remove comments (except IE conditionals)
        .replace(/\n\s*\n/g, '\n')             // Remove empty lines
        .replace(/>\s+</g, '><')               // Remove whitespace between tags
        .replace(/\s{2,}/g, ' ')               // Collapse multiple spaces
        .trim();
}

/**
 * Process a single page
 */
async function processPage(file, { templateHtml, partials, siteConfig, cache }) {
    const filePath = path.join(CONFIG.CONTENT_DIR, 'pages', file);
    const raw = await fs.readFile(filePath, 'utf8');
    
    // Check cache
    if (!needsRebuild(filePath, raw, cache)) {
        stats.files.cached++;
        return { file, cached: true };
    }
    
    const { data, content } = matter(raw);
    let finalHtml = content;
    
    // If markdown, inject into template
    if (file.endsWith('.md')) {
        const htmlContent = marked(content);
        finalHtml = templateHtml.replace(/{{CONTENT}}/g, htmlContent);
    }
    
    // Inject partials
    finalHtml = injectPartials(finalHtml, partials);
    
    // Determine output filename
    const outName = (file === 'home.md') ? 'index.html' : file.replace('.md', '.html');
    const pageSlug = outName === 'index.html' ? '' : outName;
    
    // Inject variables
    const pageDesc = data.description || siteConfig.description || '';
    finalHtml = finalHtml
        .replace(/\{\{SITE_TITLE\}\}/g, siteConfig.title || 'My Site')
        .replace(/\{\{SITE_DESC\}\}/g, pageDesc)
        .replace(/\{\{PAGE_TITLE\}\}/g, data.title || 'Page')
        .replace(/\{\{PAGE_SLUG\}\}/g, pageSlug)
        .replace(/\{\{BUILD_TIME\}\}/g, Date.now().toString(36));
    
    // Minify
    const originalSize = Buffer.byteLength(finalHtml);
    finalHtml = minifyHTML(finalHtml);
    const minifiedSize = Buffer.byteLength(finalHtml);
    
    stats.sizes.original += originalSize;
    stats.sizes.minified += minifiedSize;
    
    // Write output
    await fs.writeFile(path.join(CONFIG.DIST_DIR, outName), finalHtml);
    stats.files.processed++;
    
    return { file, outName, originalSize, minifiedSize };
}

/**
 * Process files in parallel batches
 */
async function processInParallel(items, processor, batchSize = CONFIG.MAX_PARALLEL) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);
    }
    return results;
}

/**
 * Get all files in directory recursively
 */
async function getFilesRecursive(dir) {
    const files = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...await getFilesRecursive(fullPath));
            } else {
                files.push(fullPath);
            }
        }
    } catch {
        // Directory doesn't exist
    }
    return files;
}

/**
 * Copy directory recursively with parallel file copying
 */
async function copyDir(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    await Promise.all(entries.map(async (entry) => {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }));
}

/**
 * Main build function
 */
async function buildSite() {
    stats.startTime = performance.now();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     NRIDHYA STATIC SITE GENERATOR      ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    try {
        // Load cache
        buildCache = await loadCache();
        
        // Create dist directory
        await fs.mkdir(CONFIG.DIST_DIR, { recursive: true });
        
        // Load configuration and template in parallel
        console.log('▶ Loading configuration...');
        const [configRaw, templateHtml] = await Promise.all([
            fs.readFile(path.join(CONFIG.CONTENT_DIR, 'config', 'site.json'), 'utf8'),
            fs.readFile(path.join(CONFIG.SRC_DIR, 'template.html'), 'utf8'),
        ]);
        const siteConfig = JSON.parse(configRaw);
        
        // Load partials
        console.log('\n▶ Loading partials...');
        const partials = await loadPartials();
        
        // Run image optimization (with caching)
        console.log('\n▶ Optimizing images...');
        const imageStart = performance.now();
        const imagesDir = path.join(CONFIG.CONTENT_DIR, 'images');
        const distImagesDir = path.join(CONFIG.DIST_DIR, 'images');
        
        // Skip only when CI runs optimize_images in an earlier workflow step (not for local npm run build)
        const skipImageStep =
            process.env.SKIP_IMAGE_OPTIMIZATION === 'true' && process.env.CI === 'true';
        if (skipImageStep) {
            console.log('  Skipped (CI pipeline already ran optimize_images.py)');
            stats.timings.images = 0;
        } else {
        
        // Check if images need reprocessing
        let imagesNeedProcessing = true;
        if (CONFIG.ENABLE_CACHE) {
            try {
                const imageFiles = await getFilesRecursive(imagesDir);
                const imageHashes = await Promise.all(
                    imageFiles.slice(0, 20).map(async f => { // Sample first 20 files
                        const stat = await fs.stat(f);
                        return `${f}:${stat.mtimeMs}`;
                    })
                );
                const imagesHash = hashContent(imageHashes.join('|'));
                
                if (buildCache._imagesHash === imagesHash) {
                    // Check if dist/images exists
                    try {
                        await fs.access(distImagesDir);
                        imagesNeedProcessing = false;
                        console.log('  Images unchanged, skipping optimization');
                    } catch {
                        // dist/images doesn't exist, need to process
                    }
                }
                buildCache._imagesHash = imagesHash;
            } catch {
                // If we can't check, process anyway
            }
        }
        
        if (imagesNeedProcessing) {
            try {
                const optimizeScript = path.join(__dirname, '../optimize_images.py');
                const venvPython = path.join(__dirname, '../.venv/bin/python');
                const py = fsSync.existsSync(venvPython) ? venvPython : 'python3';
                execSync(`"${py}" "${optimizeScript}"`, { stdio: 'inherit' });
            } catch {
                console.log('  Image optimization skipped (Python/Pillow not available)');
                try {
                    await copyDir(imagesDir, distImagesDir);
                    console.log('  Copied images without optimization');
                } catch {
                    console.log('  No images found');
                }
            }
        }
        stats.timings.images = Math.round(performance.now() - imageStart);
        } // End of image optimization block
        
        // Copy fonts in parallel
        console.log('\n▶ Copying fonts...');
        const fontStart = performance.now();
        const fontsDir = path.join(CONFIG.CONTENT_DIR, 'fonts');
        const distFontsDir = path.join(CONFIG.DIST_DIR, 'fonts');
        try {
            await fs.mkdir(distFontsDir, { recursive: true });
            const fonts = await fs.readdir(fontsDir);
            await Promise.all(fonts.map(font => 
                fs.copyFile(path.join(fontsDir, font), path.join(distFontsDir, font))
            ));
            console.log(`  Copied ${fonts.length} fonts`);
        } catch {
            console.log('  No fonts found');
        }
        stats.timings.fonts = Math.round(performance.now() - fontStart);
        
        // Process CSS
        console.log('\n▶ Processing CSS...');
        const cssStart = performance.now();
        const cssPath = path.join(CONFIG.SRC_DIR, 'style.css');
        let cssContent = await fs.readFile(cssPath, 'utf8');
        const originalCSSSize = Buffer.byteLength(cssContent);
        
        cssContent = minifyCSS(cssContent);
        
        // Add hash to filename for cache busting (optional)
        let cssFilename = 'style.css';
        if (CONFIG.ENABLE_HASH) {
            const cssHash = hashContent(cssContent);
            cssFilename = `style.${cssHash}.css`;
        }
        
        await fs.writeFile(path.join(CONFIG.DIST_DIR, cssFilename), cssContent);
        const minifiedCSSSize = Buffer.byteLength(cssContent);
        stats.timings.css = Math.round(performance.now() - cssStart);
        console.log(`  ${originalCSSSize}B → ${minifiedCSSSize}B (${Math.round((1 - minifiedCSSSize/originalCSSSize) * 100)}% smaller)`);
        
        // Process pages in parallel
        console.log('\n▶ Building pages...');
        const pageStart = performance.now();
        const pagesDir = path.join(CONFIG.CONTENT_DIR, 'pages');
        const pages = (await fs.readdir(pagesDir)).filter(f => f.endsWith('.md') || f.endsWith('.html'));
        
        const context = { templateHtml, partials, siteConfig, cache: buildCache };
        const results = await processInParallel(
            pages,
            (file) => processPage(file, context)
        );
        
        stats.timings.pages = Math.round(performance.now() - pageStart);
        
        // Log results
        results.forEach(r => {
            if (r.cached) {
                console.log(`  ✓ ${r.file} (cached)`);
            } else {
                const savings = Math.round((1 - r.minifiedSize / r.originalSize) * 100);
                console.log(`  ✓ ${r.outName} (${savings}% smaller)`);
            }
        });
        
        // Generate GitHub Pages specific files
        console.log('\n▶ Generating GitHub Pages files...');
        
        // .nojekyll - tells GitHub Pages to skip Jekyll processing (faster deploys)
        await fs.writeFile(path.join(CONFIG.DIST_DIR, '.nojekyll'), '');
        console.log('  ✓ .nojekyll');
        
        // robots.txt
        const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${CONFIG.SITE_URL}/sitemap.xml
`;
        await fs.writeFile(path.join(CONFIG.DIST_DIR, 'robots.txt'), robotsTxt);
        console.log('  ✓ robots.txt');
        
        // sitemap.xml
        if (CONFIG.GENERATE_SITEMAP) {
            const now = new Date().toISOString().split('T')[0];
            const sitemapEntries = results
                .filter(r => r.outName || r.file)
                .map(r => {
                    const filename = r.outName || r.file.replace('.md', '.html');
                    const url = filename === 'index.html' ? '' : filename;
                    const priority = filename === 'index.html' || filename === 'home.html' ? '1.0' : '0.8';
                    return `  <url>
    <loc>${CONFIG.SITE_URL}/${url}</loc>
    <lastmod>${now}</lastmod>
    <priority>${priority}</priority>
  </url>`;
                });
            
            const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>`;
            await fs.writeFile(path.join(CONFIG.DIST_DIR, 'sitemap.xml'), sitemap);
            console.log('  ✓ sitemap.xml');
        }
        
        // 404.html - custom error page for GitHub Pages
        if (CONFIG.GENERATE_404) {
            const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - Nridhya</title>
    <link rel="stylesheet" href="style.css">
    <style>
        .error-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 2rem;
        }
        .error-code { font-size: 8rem; color: var(--accent-gold); margin: 0; line-height: 1; }
        .error-message { font-size: 1.5rem; margin: 1rem 0 2rem; }
    </style>
</head>
<body>
    <div class="error-page">
        <h1 class="error-code">404</h1>
        <p class="error-message">The page you're looking for doesn't exist.</p>
        <a href="home.html" class="btn-primary">Return Home</a>
    </div>
</body>
</html>`;
            await fs.writeFile(path.join(CONFIG.DIST_DIR, '404.html'), notFoundHtml);
            console.log('  ✓ 404.html');
        }
        
        // Save cache
        await saveCache(buildCache);
        
        // Final statistics
        stats.endTime = performance.now();
        const totalTime = Math.round(stats.endTime - stats.startTime);
        
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║            BUILD COMPLETE              ║');
        console.log('╠════════════════════════════════════════╣');
        console.log(`║  Total time:     ${String(totalTime).padStart(6)}ms            ║`);
        console.log(`║  Files built:    ${String(stats.files.processed).padStart(6)}              ║`);
        console.log(`║  Files cached:   ${String(stats.files.cached).padStart(6)}              ║`);
        const htmlSavings = stats.sizes.original > 0 ? Math.round((1 - stats.sizes.minified/stats.sizes.original) * 100) : 0;
        console.log(`║  HTML savings:   ${String(htmlSavings).padStart(5)}%              ║`);
        console.log('╠════════════════════════════════════════╣');
        console.log('║  Timing breakdown:                     ║');
        console.log(`║    Partials:     ${String(stats.timings.partials || 0).padStart(6)}ms            ║`);
        console.log(`║    Images:       ${String(stats.timings.images || 0).padStart(6)}ms            ║`);
        console.log(`║    Fonts:        ${String(stats.timings.fonts || 0).padStart(6)}ms            ║`);
        console.log(`║    CSS:          ${String(stats.timings.css || 0).padStart(6)}ms            ║`);
        console.log(`║    Pages:        ${String(stats.timings.pages || 0).padStart(6)}ms            ║`);
        console.log('╚════════════════════════════════════════╝\n');
        
    } catch (error) {
        stats.files.failed++;
        console.error('\n╔════════════════════════════════════════╗');
        console.error('║            BUILD FAILED                ║');
        console.error('╚════════════════════════════════════════╝');
        console.error(`\nError: ${error.message}`);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack.split('\n').slice(1, 4).join('\n'));
        }
        process.exit(1);
    }
}

// Export functions for testing
module.exports = {
    hashContent,
    needsRebuild,
    injectPartials,
    minifyCSS,
    minifyHTML,
    processInParallel,
    CONFIG,
};

// Run build only if this is the main module
if (require.main === module) {
    buildSite();
}
