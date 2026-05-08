const fs = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const { execSync } = require('child_process');

const CONTENT_DIR = path.join(__dirname, '../content');
const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, '../dist');

async function buildSite() {
    try {
        console.log('Starting optimized static build...');
        console.log('================================\n');
        
        // 1. Create dist directory
        await fs.mkdir(DIST_DIR, { recursive: true });

        // 2. Load site configuration
        const configRaw = await fs.readFile(path.join(CONTENT_DIR, 'config', 'site.json'), 'utf8');
        const siteConfig = JSON.parse(configRaw);

        // 3. Load HTML template
        const templateHtml = await fs.readFile(path.join(SRC_DIR, 'template.html'), 'utf8');

        // 4. Run image optimization (Python script)
        console.log('Optimizing images...');
        try {
            const pythonPath = path.join(__dirname, '../.venv/bin/python');
            const optimizeScript = path.join(__dirname, '../optimize_images.py');
            execSync(`"${pythonPath}" "${optimizeScript}"`, { stdio: 'inherit' });
        } catch (e) {
            console.log('Image optimization skipped (Python/Pillow not available)');
            // Fallback: copy images without optimization
            const imagesDir = path.join(CONTENT_DIR, 'images');
            const distImagesDir = path.join(DIST_DIR, 'images');
            try {
                await fs.mkdir(distImagesDir, { recursive: true });
                await fs.cp(imagesDir, distImagesDir, { recursive: true });
            } catch (e) {
                console.log("No images found or error copying images.");
            }
        }

        // 5. Copy Fonts
        console.log('\nCopying fonts...');
        const fontsDir = path.join(CONTENT_DIR, 'fonts');
        const distFontsDir = path.join(DIST_DIR, 'fonts');
        try {
            await fs.mkdir(distFontsDir, { recursive: true });
            const fonts = await fs.readdir(fontsDir);
            for (const font of fonts) {
                await fs.copyFile(path.join(fontsDir, font), path.join(distFontsDir, font));
                console.log(`  Copied: ${font}`);
            }
        } catch (e) {
            console.log("  No fonts found or error copying fonts.");
        }

        // 6. Copy and minify CSS
        console.log('\nProcessing CSS...');
        let cssContent = await fs.readFile(path.join(SRC_DIR, 'style.css'), 'utf8');
        // Basic minification: remove comments and extra whitespace
        cssContent = cssContent
            .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove comments
            .replace(/\s+/g, ' ')               // Collapse whitespace
            .replace(/\s*([{}:;,])\s*/g, '$1')  // Remove space around symbols
            .replace(/;}/g, '}')                // Remove last semicolon
            .trim();
        await fs.writeFile(path.join(DIST_DIR, 'style.css'), cssContent);
        const originalSize = (await fs.stat(path.join(SRC_DIR, 'style.css'))).size;
        const minifiedSize = Buffer.byteLength(cssContent);
        console.log(`  style.css: ${originalSize}B -> ${minifiedSize}B (${Math.round((1 - minifiedSize/originalSize) * 100)}% smaller)`);

        // 7. Read and process pages
        console.log('\nBuilding pages...');
        const pagesDir = path.join(CONTENT_DIR, 'pages');
        const pages = await fs.readdir(pagesDir);

        for (const file of pages) {
            if (!file.endsWith('.md') && !file.endsWith('.html')) continue;

            const raw = await fs.readFile(path.join(pagesDir, file), 'utf8');
            const { data, content } = matter(raw);
            
            let finalHtml = content;
            
            // If it's a markdown file, inject into template
            if (file.endsWith('.md')) {
                const htmlContent = marked(content);
                finalHtml = templateHtml.replace(/{{CONTENT}}/g, htmlContent);
            }
            
            // Inject variables
            finalHtml = finalHtml
                .replace(/{{SITE_TITLE}}/g, siteConfig.title || 'My Site')
                .replace(/{{SITE_DESC}}/g, siteConfig.description || '')
                .replace(/{{PAGE_TITLE}}/g, data.title || 'Page');

            // Basic HTML minification
            finalHtml = finalHtml
                .replace(/\n\s*\n/g, '\n')      // Remove empty lines
                .replace(/>\s+</g, '><')        // Remove whitespace between tags
                .trim();

            // Output file
            const outName = (file === 'home.md') ? 'index.html' : file.replace('.md', '.html');
            await fs.writeFile(path.join(DIST_DIR, outName), finalHtml);
            console.log(`  Generated: ${outName}`);
        }
        
        console.log('\n================================');
        console.log('Build completed successfully!');
        console.log('================================');
        
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

buildSite();
