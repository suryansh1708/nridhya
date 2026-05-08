const API_BASE = '/api';

// Tab switching
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('nav a').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.tab).classList.add('active');
    });
});

// Load Config
async function loadConfig() {
    try {
        const res = await fetch(`${API_BASE}/content/config/site.json`);
        if (res.ok) {
            const config = await res.json();
            document.getElementById('site-title').value = config.title || '';
            document.getElementById('site-desc').value = config.description || '';
        }
    } catch (e) { console.error('Error loading config:', e); }
}

// Save Config
document.getElementById('save-config').addEventListener('click', async () => {
    const data = {
        title: document.getElementById('site-title').value,
        description: document.getElementById('site-desc').value
    };
    try {
        await fetch(`${API_BASE}/content/config/site.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        document.getElementById('config-status').innerText = 'Config saved successfully!';
        setTimeout(() => document.getElementById('config-status').innerText = '', 3000);
    } catch (e) { console.error('Error saving config:', e); }
});

let editor = null;

// Load Page List
async function loadPageList() {
    try {
        const res = await fetch(`${API_BASE}/content/pages`);
        if (res.ok) {
            const pages = await res.json();
            const select = document.getElementById('page-select');
            select.innerHTML = '';
            pages.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.innerText = p.id;
                select.appendChild(opt);
            });
            // Auto load first page
            if(pages.length > 0) loadPage();
        }
    } catch (e) { console.error('Error loading page list:', e); }
}

// Load Page
async function loadPage() {
    const id = document.getElementById('page-select').value;
    try {
        const res = await fetch(`${API_BASE}/content/pages/${id}`);
        if (res.ok) {
            const page = await res.json();
            document.getElementById('page-title').value = page.title || '';
            document.getElementById('page-content').value = page._content || '';
            
            if (!editor) {
                editor = grapesjs.init({
                    container: '#gjs',
                    fromElement: false,
                    height: '100%',
                    width: 'auto',
                    storageManager: false,
                    plugins: ['gjs-preset-webpage'],
                    canvas: {
                        styles: ['/preview/style.css']
                    },
                    assetManager: {
                        upload: `${API_BASE}/upload`,
                        uploadName: 'files'
                    }
                });
                
                // Sync GrapesJS -> Textarea
                editor.on('change:changesCount', () => {
                    const html = editor.getHtml();
                    const css = editor.getCss({ clearStyles: true });
                    document.getElementById('page-content').value = `${html}\n<style>${css}</style>`;
                });
            }
            
            // Load content into GrapesJS
            editor.setComponents(page._content);
        }
    } catch (e) { console.error('Error loading page:', e); }
}

// Sync Textarea -> GrapesJS (typing + paste)
function syncTextareaToEditor() {
    if (editor) {
        editor.setComponents(document.getElementById('page-content').value);
    }
}
document.getElementById('page-content').addEventListener('input', syncTextareaToEditor);
document.getElementById('page-content').addEventListener('paste', (e) => {
    // Allow the paste to complete first, then sync
    setTimeout(syncTextareaToEditor, 50);
});

// Save Page
document.getElementById('save-page').addEventListener('click', async () => {
    const btn = document.getElementById('save-page');
    btn.innerText = 'Saving...';
    
    const id = document.getElementById('page-select').value;
    const data = {
        title: document.getElementById('page-title').value,
        _content: document.getElementById('page-content').value
    };
    try {
        // 1. Save content
        await fetch(`${API_BASE}/content/pages/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        // 2. Trigger Build
        btn.innerText = 'Building...';
        await fetch(`${API_BASE}/build`, { method: 'POST' });
        
        document.getElementById('page-status').innerText = 'Page saved and built!';
        setTimeout(() => document.getElementById('page-status').innerText = '', 3000);
    } catch (e) { 
        console.error('Error saving page:', e); 
        document.getElementById('page-status').innerText = 'Error: ' + e.message;
    } finally {
        btn.innerText = 'Save & Preview';
    }
});

// Build & Deploy
function logToDeploy(msg) {
    const pre = document.getElementById('deploy-logs');
    pre.innerText += `\n${msg}`;
    pre.scrollTop = pre.scrollHeight;
}

document.getElementById('btn-build').addEventListener('click', async () => {
    logToDeploy('Starting build...');
    try {
        const res = await fetch(`${API_BASE}/build`, { method: 'POST' });
        const data = await res.json();
        logToDeploy(data.stdout || data.error);
        if (data.success) logToDeploy('Build successful!');
    } catch (e) { logToDeploy(`Build failed: ${e.message}`); }
});

document.getElementById('btn-commit').addEventListener('click', async () => {
    const msg = document.getElementById('commit-msg').value;
    logToDeploy('Committing changes...');
    try {
        const res = await fetch(`${API_BASE}/git/commit`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        logToDeploy(data.message);
    } catch (e) { logToDeploy(`Commit failed: ${e.message}`); }
});

document.getElementById('btn-push').addEventListener('click', async () => {
    logToDeploy('Pushing to remote...');
    try {
        const res = await fetch(`${API_BASE}/git/push`, { method: 'POST' });
        const data = await res.json();
        logToDeploy(data.message);
    } catch (e) { logToDeploy(`Push failed: ${e.message}`); }
});

document.getElementById('page-select').addEventListener('change', loadPage);

// Initialize
loadConfig();
loadPageList();
