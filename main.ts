import { App, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, FileSystemAdapter } from 'obsidian';
import { exec } from 'child_process';
import { TemplateMetadata } from './Template';
import * as fs from 'fs';
import { createSelectPromptModal, promptWithRetry, createTextPromptModal, createTextareaPromptModal, createTagsPromptModal, promptForTitle, promptForTags, promptForImportance, promptForDescription } from './modals';
import * as path from 'path';
import * as vm from 'vm';
import { readConfig, writeConfig, updateConfig, deleteFile, readFile, writeFile, updateFile, FolderSuggest } from './utils';

// Type definitions for better type safety
interface UrlParams {
	type?: string | string[];
	url?: string | string[];
	title?: string | string[];
	[key: string]: string | string[] | undefined;
}

interface DiscoveredTemplateMetadata {
	name: string;
	description?: string;
	className: string;
	filePath: string;
	templateMetadata?: TemplateMetadata;
}

interface ObsidianDynamicTemplatesSettings {
	scriptsDirectory: string;
}

const DEFAULT_SETTINGS: ObsidianDynamicTemplatesSettings = {
	scriptsDirectory: 'Scripts'
}

// Add Node.js type import for require
// @ts-ignore

export default class ObsidianDynamicTemplatesPlugin extends Plugin {
	settings: ObsidianDynamicTemplatesSettings;
	urlParams: Record<string, string | string[]>;
	private templates: DiscoveredTemplateMetadata[] = [];

	async onload() {
		await this.loadSettings();
		this.writeFullConfig();

		// Always (re)write .config with correct values on load
		try {
			const adapter = this.app.vault.adapter;
			let vaultPath: string | null = null;
			if (adapter instanceof FileSystemAdapter) {
				vaultPath = adapter.getBasePath();
			}
			if (vaultPath) {
				const pluginPath = path.join(vaultPath, '.obsidian', 'plugins', 'dynamic-templates');
				const configPath = path.join(pluginPath, '.config');
				const scriptsDir = this.settings.scriptsDirectory || 'Scripts';
				const scriptPath = path.join(vaultPath, scriptsDir);
				const templateRelPath = path.relative(scriptPath, path.join(pluginPath, 'Template.js'));
				const configContent = [
					`VAULT_PATH=${vaultPath}`,
					`PLUGIN_PATH=${pluginPath}`,
					`SCRIPT_PATH=${scriptPath}`,
					`TEMPLATE_PATH=Template.js`,
					`TEMPLATE_REL_PATH=${templateRelPath}`
				].join('\n');
				fs.writeFileSync(configPath, configContent, 'utf8');
			}
		} catch (e) {
			console.error('Failed to create .config file:', e);
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ObsidianDynamicTemplatesSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		// Register a URL handler to store all params with their key and value
		this.urlParams = {};
		this.registerObsidianProtocolHandler('obsidian-dynamic-templates', async (params) => {
			try {
				await this.handleUrlParams(params);
			} catch (e) {
				new Notice(`Failed to execute createUrlFileWithParams: ${e.message}`);
			}
		});

		// Dynamic Template Discovery and Command Registration
		const registerDynamicTemplateCommands = () => {
			const scriptsDir = path.join((this.app.vault.adapter as any).basePath, this.settings.scriptsDirectory);
			let templateFiles: string[] = [];
			try {
				templateFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'));
			} catch (e) {
				new Notice('Failed to scan Scripts folder for templates.');
				console.error(e);
				return;
			}
			for (const file of templateFiles) {
				const type = file.replace('.js', '');
				let TemplateClass;
				try {
					TemplateClass = runTemplateURLWithInjection(this.app, this.settings, type, 'https://example.com', `${type} Example`).constructor;
				} catch (e) {
					new Notice(`Failed to load template: ${file}`);
					console.error(e);
					continue;
				}
				if (TemplateClass) {
					// Try to validate template and get metadata
					let templateMetadata: TemplateMetadata | undefined;
					try {
						const templateInstance = new TemplateClass();
						if (templateInstance.validateMetadata && templateInstance.validateMetadata()) {
							templateMetadata = templateInstance.getMetadata();
						}
					} catch (error) {
						console.error(`Failed to validate template ${type}:`, error);
					}

					this.addCommand({
						id: `create-${type.toLowerCase()}-file-dynamic`,
						name: `Create ${type} File (Dynamic)`,
						callback: async () => {
							try {
								const templateInstance = runTemplateURLWithInjection(this.app, this.settings, type, 'https://example.com', `${type} Example`);
								// Validate template if validation methods exist
								if (templateInstance.validateMetadata && !templateInstance.validateMetadata()) {
									new Notice(`Template ${type} failed metadata validation`);
									return;
								}
								const params = {
									title: `${type} Example`,
									url: 'https://example.com',
									type
								};
								// Validate parameters if validation method exists
								if (templateInstance.validateParams && !templateInstance.validateParams(params)) {
									new Notice(`Template ${type} failed parameter validation`);
									return;
								}
								await templateInstance.createTemplatedFile(this.app, params);
							} catch (e) {
								new Notice(`Failed to create ${type} file: ${e.message}`);
								console.error(e);
							}
						}
					});
				}
			}
		};
		registerDynamicTemplateCommands.call(this);

		// Add command to create file from template with manual URL input
		this.addCommand({
			id: 'create-file-from-template',
			name: 'Create file from template',
			callback: async () => {
				await this.showTemplateSelectionModal();
			}
		});

		// Add command to update wishlist status based on checkbox
		this.addCommand({
			id: 'update-wishlist-status',
			name: 'Update Wishlist Status',
			checkCallback: (checking: boolean) => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					if (!checking) {
						this.updateWishlistStatus(activeView);
					}
					return true;
				}
				return false;
			}
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.writeFullConfig();
	}

	// Helper to run a Node.js script with params as JSON
	async runScript(scriptPath: string, params: Record<string, string>) {
		return new Promise((resolve, reject) => {
			exec(`node "${scriptPath}" '${JSON.stringify(params)}'`, (error, stdout, stderr) => {
				if (error) return reject(error);
				resolve(stdout);
			});
		});
	}

	// Shared method to handle URL params and call createUrlFileWithParams
	async handleUrlParams(params: UrlParams) {
		// Filter out undefined values and store params
		this.urlParams = Object.fromEntries(
			Object.entries(params).filter(([_, value]) => value !== undefined)
		) as Record<string, string | string[]>;
		new Notice('URL params received and stored.');

		// Normalize parameters: if any are arrays, use the first value
		const type = Array.isArray(params.type) ? params.type[0] : params.type;
		const url = Array.isArray(params.url) ? params.url[0] : params.url;
		const title = Array.isArray(params.title) ? params.title[0] : params.title;

		if (type && url && title) {
			// Try to find and use a template for this type
			const templateFile = `${type}.js`;
			const templateClassName = `${type.charAt(0).toUpperCase() + type.slice(1)}Template`;
			
			try {
				// @ts-ignore
				let templateModule, TemplateClass;
				try {
					templateModule = eval('require')(`${path.join((this.app.vault.adapter as any).basePath, this.settings.scriptsDirectory)}/${templateFile}`);
					TemplateClass = templateModule[templateClassName];
				} catch (e) {
					console.error(`Failed to load template module ${templateFile}:`, e);
					throw e;
				}
				
				if (TemplateClass) {
					const templateInstance = new TemplateClass();
					
					// Validate template metadata if validation methods exist
					if (templateInstance.validateMetadata && !templateInstance.validateMetadata()) {
						new Notice(`Template ${type} failed metadata validation`);
						return;
					}
					
					const templateParams = { type, url, title };
					
					// Validate parameters if validation method exists
					if (templateInstance.validateParams && !templateInstance.validateParams(templateParams)) {
						new Notice(`Template ${type} failed parameter validation`);
						return;
					}
					
					// Use the template to create the file
					const result = await templateInstance.createTemplatedFile(this.app, templateParams);
					if (result) {
						new Notice(`✅ Resource file created successfully for type=${type}`);
					} else {
						new Notice(`❌ Failed to create resource file for type=${type}`);
					}
				} else {
					throw new Error(`Template class ${templateClassName} not found`);
				}
			} catch (e) {
				console.error(`Failed to use template for type ${type}:`, e);
				new Notice(`❌ Failed to create resource file for type=${type}: ${e.message}`);
			}
		} else {
			new Notice('❌ Missing required parameters: type, url, title');
		}
	}

	// Method to update wishlist status based on checkbox state
	async updateWishlistStatus(view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		const content = await this.app.vault.read(file);
		const cache = this.app.metadataCache.getFileCache(file);
		
		// Check if this is a wishlist file
		const frontmatter = cache?.frontmatter;
		if (!frontmatter || !frontmatter.tags || !frontmatter.tags.includes('wishlist')) {
			new Notice('This command only works on wishlist files');
			return;
		}

		// Look for the checkbox in the content
		const checkboxRegex = /^- \[([ x])\] Mark as Inactive/m;
		const match = content.match(checkboxRegex);
		
		if (!match) {
			new Notice('Could not find status checkbox in this wishlist item');
			return;
		}

		const isChecked = match[1] === 'x';
		const newStatus = isChecked ? 'Inactive' : 'Active';
		
		// Update frontmatter status
		const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
		const frontmatterMatch = content.match(frontmatterRegex);
		
		if (frontmatterMatch) {
			const frontmatterContent = frontmatterMatch[1];
			const statusRegex = /^status: .+$/m;
			
			let newFrontmatter;
			if (statusRegex.test(frontmatterContent)) {
				newFrontmatter = frontmatterContent.replace(statusRegex, `status: ${newStatus}`);
			} else {
				newFrontmatter = frontmatterContent + `\nstatus: ${newStatus}`;
			}
			
			const newContent = content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---`);
			
			// Also update the status in the Details section
			const detailsStatusRegex = /(\*\*Status:\*\* ).+/;
			const finalContent = newContent.replace(detailsStatusRegex, `$1${newStatus}`);
			
			await this.app.vault.modify(file, finalContent);
			new Notice(`Wishlist status updated to: ${newStatus}`);
		} else {
			new Notice('Could not find frontmatter in this file');
		}
	}

	// Method to show template selection modal and create file with manual URL input
	async showTemplateSelectionModal() {
		try {
			// Get available templates by scanning the scripts directory
			const scriptsDir = path.join((this.app.vault.adapter as any).basePath, this.settings.scriptsDirectory);
			let templateFiles: string[] = [];
			try {
				templateFiles = fs.readdirSync(scriptsDir).filter((f: string) => f.endsWith('.js'));
			} catch (e) {
				new Notice('Failed to scan Scripts folder for templates.');
				console.error(e);
				return;
			}

			if (templateFiles.length === 0) {
				new Notice('No templates found in Scripts directory');
				return;
			}

			// Create options for the dropdown
			const templateOptions: Array<{ value: string; text: string }> = [];
			for (const file of templateFiles) {
				const type = file.replace('.js', '');
				const templateClassName = `${type.charAt(0).toUpperCase() + type.slice(1)}Template`;
				
				try {
					// @ts-ignore
					const templateModule = eval('require')(`${path.join((this.app.vault.adapter as any).basePath, this.settings.scriptsDirectory)}/${file}`);
					const TemplateClass = templateModule[templateClassName];
					
					if (TemplateClass) {
						const templateInstance = new TemplateClass();
						let displayName = type;
						
						// Try to get a better display name from metadata
						try {
							if (templateInstance.getMetadata) {
								const metadata = templateInstance.getMetadata();
								displayName = metadata.name || type;
							}
						} catch (e) {
							// Use default name if metadata fails
						}
						
						templateOptions.push({
							value: type,
							text: displayName
						});
					}
				} catch (e) {
					console.error(`Failed to load template ${type}:`, e);
					// Still add it as an option with basic name
					templateOptions.push({
						value: type,
						text: type
					});
				}
			}

			if (templateOptions.length === 0) {
				new Notice('No valid templates found');
				return;
			}

			// Show template selection modal
			const selectedType = await promptWithRetry(
				(args) => createSelectPromptModal(args),
				{
					app: this.app,
					message: 'Select template type:',
					options: templateOptions,
					defaultValue: templateOptions[0].value
				},
				'ObsidianDynamicTemplatesPlugin.showTemplateSelectionModal'
			);

			if (!selectedType) return;

			// Load the selected template and call createManualTemplate
			const templateFile = `${selectedType}.js`;
			const templateClassName = `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}Template`;
			
			try {
				// @ts-ignore
				const templateModule = eval('require')(`${path.join((this.app.vault.adapter as any).basePath, this.settings.scriptsDirectory)}/${templateFile}`);
				const TemplateClass = templateModule[templateClassName];
				
				if (TemplateClass) {
					const templateInstance = new TemplateClass();
					
					// Validate template metadata if validation methods exist
					if (templateInstance.validateMetadata && !templateInstance.validateMetadata()) {
						new Notice(`Template ${selectedType} failed metadata validation`);
						return;
					}
					
					// Use the manual template creation method
					const result = await templateInstance.createManualTemplate(this.app, selectedType);
					if (result) {
						new Notice(`✅ ${selectedType} file created successfully`);
					} else {
						new Notice(`❌ Failed to create ${selectedType} file`);
					}
				} else {
					throw new Error(`Template class ${templateClassName} not found`);
				}
			} catch (e) {
				new Notice(`Failed to load template ${selectedType}: ${e.message}`);
				console.error(e);
			}
		} catch (error) {
			new Notice(`Error showing template selection: ${error.message}`);
			console.error(error);
		}
	}

	private writeFullConfig() {
		const adapter = this.app.vault.adapter;
		let vaultPath: string | null = null;
		if (adapter instanceof FileSystemAdapter) {
			vaultPath = adapter.getBasePath();
		}
		if (vaultPath) {
			const pluginPath = path.join(vaultPath, '.obsidian', 'plugins', 'dynamic-templates');
			const configPath = path.join(pluginPath, '.config');
			const scriptsDir = this.settings.scriptsDirectory || 'Scripts';
			const scriptPath = path.join(vaultPath, scriptsDir);
			const templateRelPath = path.relative(scriptPath, path.join(pluginPath, 'Template.js'));
			const configContent = [
				`VAULT_PATH=${vaultPath}`,
				`PLUGIN_PATH=${pluginPath}`,
				`SCRIPT_PATH=${scriptPath}`,
				`TEMPLATE_PATH=Template.js`,
				`TEMPLATE_REL_PATH=${templateRelPath}`
			].join('\n');
			fs.writeFileSync(configPath, configContent, 'utf8');
		}
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class ObsidianDynamicTemplatesSettingTab extends PluginSettingTab {
	plugin: ObsidianDynamicTemplatesPlugin;

	constructor(app: App, plugin: ObsidianDynamicTemplatesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		const setting = new Setting(containerEl)
			.setName('Scripts Directory')
			.setDesc('Directory where template scripts are located (relative to vault root)');

		const input = document.createElement('input');
		input.type = 'text';
		input.placeholder = 'Scripts';
		input.value = this.plugin.settings.scriptsDirectory;
		input.style.width = '70%';
		setting.controlEl.appendChild(input);

		const errorEl = document.createElement('div');
		errorEl.style.color = 'red';
		errorEl.style.marginTop = '4px';
		setting.controlEl.appendChild(errorEl);

		const validate = (val: string) => {
			const folder = this.app.vault.getAbstractFileByPath(val);
			if (!folder || folder.constructor.name !== 'TFolder') {
				errorEl.textContent = `Could not find folder: ${val}`;
				return false;
			} else {
				errorEl.textContent = '';
				return true;
			}
		};

		input.addEventListener('input', async (e) => {
			const val = input.value.trim() || 'Scripts';
			this.plugin.settings.scriptsDirectory = val;
			validate(val);
			await this.plugin.saveSettings();
		});

		// FolderSuggest modal on focus
		input.addEventListener('focus', () => {
			new FolderSuggest(this.app, (folder) => {
				input.value = folder.path;
				this.plugin.settings.scriptsDirectory = folder.path;
				validate(folder.path);
				this.plugin.saveSettings();
			}).open();
		});

		// Initial validation
		validate(input.value);
	}
}

function runTemplateURLWithInjection(app: any, settings: any, type: string, url: string, title: string) {
	const pluginBasePath = (app.vault.adapter as any).basePath;
	const pluginPath = path.join(pluginBasePath, '.obsidian', 'plugins', 'dynamic-templates');
	const config = readConfig(path.join(pluginPath, '.config'));
	if (!config.TEMPLATE_PATH) throw new Error('TEMPLATE_PATH not found in .config');
	const scriptPath = path.join(pluginBasePath, settings.scriptsDirectory, `${type}.js`);
	const scriptCode = readFile(scriptPath);
	const context = {
		require,
		module,
		__dirname: path.dirname(scriptPath),
		TEMPLATE_PATH: path.join(pluginPath, config.TEMPLATE_PATH),
	};
	vm.createContext(context);
	const script = new vm.Script(scriptCode, { filename: scriptPath });
	script.runInContext(context);
	const templateClassName = `${type.charAt(0).toUpperCase() + type.slice(1)}Template`;
	const TemplateClass = context.module.exports[templateClassName];
	if (!TemplateClass) throw new Error(`Template class ${templateClassName} not found in ${scriptPath}`);
	return new TemplateClass();
}

function runTemplateManualWithInjection(app: any, settings: any, selectedType: string) {
	const pluginBasePath = (app.vault.adapter as any).basePath;
	const pluginPath = path.join(pluginBasePath, '.obsidian', 'plugins', 'dynamic-templates');
	const config = readConfig(path.join(pluginPath, '.config'));
	if (!config.TEMPLATE_PATH) throw new Error('TEMPLATE_PATH not found in .config');
	const scriptPath = path.join(pluginBasePath, settings.scriptsDirectory, `${selectedType}.js`);
	const scriptCode = readFile(scriptPath);
	const context = {
		require,
		module,
		__dirname: path.dirname(scriptPath),
		TEMPLATE_PATH: path.join(pluginPath, config.TEMPLATE_PATH),
	};
	vm.createContext(context);
	const script = new vm.Script(scriptCode, { filename: scriptPath });
	script.runInContext(context);
	const templateClassName = `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}Template`;
	const TemplateClass = context.module.exports[templateClassName];
	if (!TemplateClass) throw new Error(`Template class ${templateClassName} not found in ${scriptPath}`);
	return new TemplateClass();
} 