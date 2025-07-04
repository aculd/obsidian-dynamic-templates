import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

const banner =
`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = (process.argv[2] === 'production');

// Get all dependencies and peerDependencies from package.json
const allDeps = [
	...Object.keys(pkg.dependencies || {}),
	...Object.keys(pkg.peerDependencies || {})
];

const buildOptions = {
	banner: {
		js: banner,
	},
	entryPoints: ['main.ts'],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/view',
		'@lezer/common',
		'@lezer/highlight',
		'@lezer/lr',
		...builtins,
		...allDeps,
		"*"
	],
	format: 'cjs',
	target: 'es2018',
	platform: 'node',
	logLevel: "info",
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outfile: 'main.js',
};

if (!prod) {
	buildOptions.watch = true;
}

esbuild.build(buildOptions).catch(() => process.exit(1)); 