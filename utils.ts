import * as fs from 'fs';
import * as path from 'path';
import { TFolder, App, FuzzySuggestModal } from 'obsidian';

// Reads a config file and returns an object of key-value pairs
export function readConfig(configPath: string): Record<string, string> {
    if (!fs.existsSync(configPath)) throw new Error(`Config file not found: ${configPath}`);
    const config = fs.readFileSync(configPath, 'utf8');
    const result: Record<string, string> = {};
    config.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) result[match[1]] = match[2];
    });
    return result;
}

// Writes a config object to a file (overwrites)
export function writeConfig(configPath: string, configObj: Record<string, string>) {
    const content = Object.entries(configObj).map(([k, v]) => `${k}=${v}`).join('\n');
    fs.writeFileSync(configPath, content);
}

// Updates a config file with new key-value pairs
export function updateConfig(configPath: string, updates: Record<string, string>) {
    const config = readConfig(configPath);
    Object.assign(config, updates);
    writeConfig(configPath, config);
}

// Reads a file and returns its contents as string
export function readFile(filePath: string): string {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
    return fs.readFileSync(filePath, 'utf8');
}

// Writes content to a file (overwrites)
export function writeFile(filePath: string, content: string) {
    fs.writeFileSync(filePath, content);
}

// Updates a file by applying a callback to its contents
export function updateFile(filePath: string, updater: (content: string) => string) {
    const content = readFile(filePath);
    const updated = updater(content);
    writeFile(filePath, updated);
}

// Deletes a file
export function deleteFile(filePath: string) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export class FolderSuggest extends FuzzySuggestModal<TFolder> {
    constructor(app: App, private onChoose: (folder: TFolder) => void) {
        super(app);
    }
    getItems(): TFolder[] {
        return this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder) as TFolder[];
    }
    getItemText(item: TFolder): string {
        return item.path;
    }
    onChooseItem(item: TFolder) {
        this.onChoose(item);
    }
} 