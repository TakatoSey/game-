const fs = require('fs');
const path = require('path');

// Create public directory if it doesn't exist
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

// List of files to move
const filesToMove = ['index.html', 'styles.css', 'game.js'];

// Move each file
filesToMove.forEach(file => {
    if (fs.existsSync(file)) {
        fs.renameSync(file, path.join('public', file));
    }
});
