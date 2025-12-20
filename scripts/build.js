const fs = require('fs').promises;
const path = require('path');

const componentsDir = path.join(__dirname, '..', 'components');
const sourceDir = path.join(__dirname, '..');
const distDir = path.join(__dirname, '..', 'dist');

const componentCache = new Map();

async function getComponentContent(componentPath) {
    if (componentCache.has(componentPath)) {
        return componentCache.get(componentPath);
    }

    try {
        let content = await fs.readFile(componentPath, 'utf8');
        // If the component is a full HTML file, extract only the body content.
        const bodyMatch = content.match(/<body>([\s\S]*)<\/body>/);
        if (bodyMatch) {
            content = bodyMatch[1].trim();
        }
        componentCache.set(componentPath, content);
        return content;
    } catch (error) {
        console.error(`Error reading component: ${componentPath}`, error);
        return `<!-- ERROR: Component ${componentPath} not found -->`;
    }
}

async function buildHtmlFile(filePath) {
    let content = await fs.readFile(filePath, 'utf8');
    const componentRegex = /<!--\s*COMPONENT:\s*(.*?)\s*-->/g;

    const replacements = [];

    let match;
    while ((match = componentRegex.exec(content)) !== null) {
        const [placeholder, componentName] = match;
        const componentPath = path.join(sourceDir, componentName);
        replacements.push({
            placeholder,
            content: await getComponentContent(componentPath),
        });
    }

    // Second pass for JS-based includes, which will also be replaced
    const scriptIncludeRegex = /<script>([\s\S]*?)fetch\(['"](components\/[^'"]+)['"]\)([\s\S]*?)<\/script>/g;
    while ((match = scriptIncludeRegex.exec(content)) !== null) {
        const [scriptBlock, , componentPath] = match;
        const fullComponentPath = path.join(sourceDir, componentPath);
        replacements.push({
            placeholder: scriptBlock,
            content: `<!-- COMPONENT: ${componentPath} -->` // First, replace the script with a standard placeholder
        });
    }
    
    // Replace script blocks first
    for (const { placeholder, content: newContent } of replacements) {
        content = content.replace(placeholder, newContent);
    }

    // Now, process the standard component placeholders
    const finalReplacements = [];
    while ((match = componentRegex.exec(content)) !== null) {
        const [placeholder, componentName] = match;
        const componentPath = path.join(sourceDir, componentName);
        finalReplacements.push({
            placeholder,
            content: await getComponentContent(componentPath),
        });
    }

    for (const { placeholder, content: newContent } of finalReplacements) {
        content = content.replace(placeholder, newContent);
    }

    const distFilePath = path.join(distDir, path.basename(filePath));
    await fs.writeFile(distFilePath, content, 'utf8');
    console.log(`Built: ${distFilePath}`);
}


async function copyAssets() {
    const assetDirs = ['css', 'images', 'js', 'json', 'article'];
    await fs.cp(path.join(sourceDir, 'favicon.ico'), path.join(distDir, 'favicon.ico'));
    await fs.cp(path.join(sourceDir, 'site.webmanifest'), path.join(distDir, 'site.webmanifest'));
    await fs.cp(path.join(sourceDir, 'robots.txt'), path.join(distDir, 'robots.txt'));
    await fs.cp(path.join(sourceDir, 'sw.js'), path.join(distDir, 'sw.js'));

    for (const dir of assetDirs) {
        const sourceAssetDir = path.join(sourceDir, dir);
        const distAssetDir = path.join(distDir, dir);
        try {
            await fs.cp(sourceAssetDir, distAssetDir, { recursive: true });
            console.log(`Copied asset directory: ${dir}`);
        } catch (error) {
            if (error.code !== 'ENOENT') { // Ignore if source dir doesn't exist
                console.error(`Error copying directory ${dir}:`, error);
            }
        }
    }
}

async function main() {
    console.log('Starting build process...');
    try {
        await fs.mkdir(distDir, { recursive: true });

        const files = await fs.readdir(sourceDir);
        const htmlFiles = files.filter(file => file.endsWith('.html'));

        for (const file of htmlFiles) {
            await buildHtmlFile(path.join(sourceDir, file));
        }

        await copyAssets();

        console.log('Build process completed successfully!');
    } catch (error) {
        console.error('Build process failed:', error);
        process.exit(1);
    }
}

main();
