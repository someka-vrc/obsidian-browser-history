import { readFileSync, existsSync, mkdirSync, copyFileSync, utimesSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(path) {
	if (!existsSync(path)) return {};
	const content = readFileSync(path, 'utf-8');
	const env = {};
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const eq = line.indexOf('=');
		if (eq === -1) continue;
		const key = line.slice(0, eq).trim();
		let value = line.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		env[key] = value;
	}
	return env;
}

const envFromFile = loadEnvFile(resolve('.env'));
const targetDir = process.env.OBSIDIAN_PLUGIN_DIR ?? envFromFile.OBSIDIAN_PLUGIN_DIR;

if (!targetDir) {
	console.error(
		'OBSIDIAN_PLUGIN_DIR is not set.\n' +
			'Copy .env.example to .env and set OBSIDIAN_PLUGIN_DIR to your local Obsidian plugin folder.',
	);
	process.exit(1);
}

const files = ['manifest.json', 'main.js', 'styles.css'];

mkdirSync(targetDir, { recursive: true });

for (const file of files) {
	const src = resolve(file);
	if (!existsSync(src)) {
		console.warn(`Skip (not found): ${file}`);
		continue;
	}
	copyFileSync(src, resolve(targetDir, file));
	console.log(`Copied ${file} -> ${targetDir}`);
}

// The Hot Reload plugin (pjeby/hot-reload) watches the `.hotreload` file inside a
// watched plugin folder and reloads the plugin when it changes. Touch it after copying.
const hotReloadFile = resolve(targetDir, '.hotreload');
try {
	if (existsSync(hotReloadFile)) {
		const now = new Date();
		utimesSync(hotReloadFile, now, now);
	} else {
		writeFileSync(hotReloadFile, '');
	}
	console.log(`Touched ${hotReloadFile}`);
} catch (err) {
	console.warn(`Failed to touch .hotreload (continuing): ${err.message}`);
}
