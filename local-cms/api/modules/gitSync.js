const simpleGit = require('simple-git');
const path = require('path');

const REPO_DIR = path.join(__dirname, '../../../');
const git = simpleGit(REPO_DIR);

/**
 * Commits the current state of the content directory (and other changes)
 */
async function commitChanges(message = "Update content via Local CMS") {
    try {
        await git.add('./content/*');
        const status = await git.status();
        
        if (status.staged.length === 0) {
            return { success: true, message: "No changes to commit." };
        }
        
        await git.commit(message);
        return { success: true, message: "Changes committed successfully." };
    } catch (error) {
        console.error("Git commit error:", error);
        throw error;
    }
}

/**
 * Pushes changes to the remote repository
 */
async function pushChanges() {
    try {
        await git.push();
        return { success: true, message: "Changes pushed to remote." };
    } catch (error) {
        console.error("Git push error:", error);
        throw error;
    }
}

module.exports = {
    commitChanges,
    pushChanges
};
