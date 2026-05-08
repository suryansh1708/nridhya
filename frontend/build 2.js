const fs = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const CONTENT_DIR = path.join(__dirname, '../content');
const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, '../dist'); // Output straight to nridhya/dist

async function buildSite() {
    try {
        console.log('Starting custom static build...');
        
        // 1. Create dist directory
        await fs.mkdir(DIST_DIR, { recursive: true });

        // 2. Load site configuration
        const configRaw = await fs.readFile(path.join(CONTENT_DIR, 'config', 'site.json'), 'utf8');
        const siteConfig = JSON.parse(configRaw);

        // 3. Load HTML template
        const templateHtml = await fs.readFile(path.join(SRC_DIR, 'template.html'), 'utf8');

        // Copy Images
        const imagesDir = path.join(CONTENT_DIR, 'images');
        const distImagesDir = path.join(DIST_DIR, 'images');
        try { await fs.mkdir(distImagesDir, { recursive: true }); } catch (e) {}
        try {
            const images = await fs.readdir(imagesDir);
            for (const img of images) {
                await fs.copyFile(path.join(imagesDir, img), path.join(distImagesDir, img));
            }
        } catch (e) {
            console.log("No images found or error copying images.");
        }

        // 4. Copy CSS
        const cssContent = await fs.readFile(path.join(SRC_DIR, 'style.css'), 'utf8');
        await fs.writeFile(path.join(DIST_DIR, 'style.css'), cssContent);

        // 5. Read pages
        const pagesDir = path.join(CONTENT_DIR, 'pages');
        const pages = await fs.readdir(pagesDir);

        for (const file of pages) {
            if (!file.endsWith('.md') && !file.endsWith('.html')) continue;

            const raw = await fs.readFile(path.join(pagesDir, file), 'utf8');
            const { data, content } = matter(raw);
            
            let finalHtml = content;
            
            // If it's a markdown file, we inject it into the template.
            if (file.endsWith('.md')) {
                const htmlContent = marked(content);
                finalHtml = templateHtml.replace(/{{CONTENT}}/g, htmlContent);
            }
            
            // Inject variables for both HTML and MD pages
            finalHtml = finalHtml
                .replace(/{{SITE_TITLE}}/g, siteConfig.title || 'My Site')
                .replace(/{{SITE_DESC}}/g, siteConfig.description || '')
                .replace(/{{PAGE_TITLE}}/g, data.title || 'Page');

            // Output file
            const outName = (file === 'home.md') ? 'index.html' : file.replace('.md', '.html');
            await fs.writeFile(path.join(DIST_DIR, outName), finalHtml);
            console.log(`Generated ${outName}`);
        }
        
        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

buildSite();
