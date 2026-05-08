const express = require('express');
const path = require('path');
const cors = require('cors');
const { getCollection, getEntry, updateEntry, deleteEntry } = require('./modules/fsStorage');
const { triggerBuild } = require('./modules/buildOrchestrator');
const { commitChanges, pushChanges } = require('./modules/gitSync');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../ui')));
app.use('/preview', express.static(path.join(__dirname, '../../dist')));

// --- Content API Endpoints ---

// Get all items in a collection
app.get('/api/content/:collection', async (req, res) => {
    try {
        const entries = await getCollection(req.params.collection);
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a single item
app.get('/api/content/:collection/:id', async (req, res) => {
    try {
        const entry = await getEntry(req.params.collection, req.params.id);
        if (!entry) return res.status(404).json({ error: 'Not found' });
        res.json(entry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create or update an item
app.put('/api/content/:collection/:id', async (req, res) => {
    try {
        const result = await updateEntry(req.params.collection, req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete an item
app.delete('/api/content/:collection/:id', async (req, res) => {
    try {
        const result = await deleteEntry(req.params.collection, req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- Orchestration & Deployment API Endpoints ---

// Trigger static site build
app.post('/api/build', async (req, res) => {
    try {
        const result = await triggerBuild();
        res.json(result);
    } catch (error) {
        res.status(500).json(error);
    }
});

// Save changes to Git
app.post('/api/git/commit', async (req, res) => {
    try {
        const message = req.body.message || "Update content via Local CMS";
        const result = await commitChanges(message);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Push changes to Remote
app.post('/api/git/push', async (req, res) => {
    try {
        const result = await pushChanges();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Local CMS Backend running at http://localhost:${PORT}`);
    console.log(`Ready to manage content and trigger static builds.`);
});
