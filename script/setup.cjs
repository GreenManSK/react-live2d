const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach((file) => {
        if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
            arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
        } else if (file.endsWith('.ts')) {
            arrayOfFiles.push(path.join(dirPath, file));
        }
    });

    return arrayOfFiles;
}

function addTsIgnoreToFiles() {
    const files = getAllFiles('CubismWebFramework/src');

    files.forEach((file) => {
        const filePath = path.resolve(file);
        const content = fs.readFileSync(filePath, 'utf8');
        const tsIgnoreComment = '// @ts-nocheck\n';

        if (!content.startsWith(tsIgnoreComment)) {
            const newContent = tsIgnoreComment + content;
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Added ts-nocheck to ${file}`);
        }
    });
}

addTsIgnoreToFiles();
