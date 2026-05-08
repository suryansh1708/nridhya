const fs = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');

// The absolute or relative path to the content directory
const CONTENT_DIR = path.join(__dirname, '../../../content');

/**
 * Gets a list of all files in a specific collection (directory)
 */
async function getCollection(collection) {
    const dirPath = path.join(CONTENT_DIR, collection);
    try {
        const files = await fs.readdir(dirPath);
        const entries = [];
        
        for (const file of files) {
            if (file.endsWith('.md') || file.endsWith('.json') || file.endsWith('.html')) {
                const filePath = path.join(dirPath, file);
                const fileContents = await fs.readFile(filePath, 'utf8');
                
                if (file.endsWith('.md') || file.endsWith('.html')) {
                    const { data } = matter(fileContents);
                    entries.push({ id: file, ...data });
                } else {
                    const data = JSON.parse(fileContents);
                    entries.push({ id: file, ...data });
                }
            }
        }
        return entries;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return []; // Collection doesn't exist yet
        }
        throw error;
    }
}

/**
 * Gets a single entry from a collection
 */
async function getEntry(collection, id) {
    const filePath = path.join(CONTENT_DIR, collection, id);
    try {
        const fileContents = await fs.readFile(filePath, 'utf8');
        if (id.endsWith('.md') || id.endsWith('.html')) {
            const { data, content } = matter(fileContents);
            return { id, _content: content, ...data };
        } else {
            return { id, ...JSON.parse(fileContents) };
        }
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

/**
 * Creates or updates an entry in a collection
 */
async function updateEntry(collection, id, payload) {
    const dirPath = path.join(CONTENT_DIR, collection);
    await fs.mkdir(dirPath, { recursive: true });
    
    const filePath = path.join(dirPath, id);
    
    if (id.endsWith('.md') || id.endsWith('.html')) {
        const { _content, ...data } = payload;
        const fileContent = matter.stringify(_content || '', data);
        await fs.writeFile(filePath, fileContent, 'utf8');
    } else if (id.endsWith('.json')) {
        await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
    } else {
        throw new Error('Unsupported file extension. Use .md, .html, or .json');
    }
    
    return { success: true, id };
}

/**
 * Deletes an entry
 */
async function deleteEntry(collection, id) {
    const filePath = path.join(CONTENT_DIR, collection, id);
    await fs.unlink(filePath);
    return { success: true };
}

module.exports = {
    getCollection,
    getEntry,
    updateEntry,
    deleteEntry
};
