import { App, Modal, Notice } from 'obsidian';
import { InputError, handleError } from './errors';

// Interface definitions for modal parameters
export interface TextPromptModalParams {
    app: App;
    message: string;
    placeholder?: string;
    defaultValue?: string;
    title?: string;
    required?: boolean;
    buttonText?: string;
    cancelText?: string;
}

export interface SelectPromptModalParams {
    app: App;
    message: string;
    options: Array<{
        value: string | number;
        text: string;
    }>;
    defaultValue?: string | number;
    title?: string;
    buttonText?: string;
    cancelText?: string;
}

export interface TextareaPromptModalParams {
    app: App;
    message: string;
    placeholder?: string;
    defaultValue?: string;
    title?: string;
    rows?: number;
    buttonText?: string;
    cancelText?: string;
    ctrlEnterToSubmit?: boolean;
}

/**
 * Creates a text input modal for prompting user input
 */
export function createTextPromptModal(
    params: TextPromptModalParams
): Promise<string | null> {
    return new Promise((resolve) => {
        const modal = new Modal(params.app);
        modal.titleEl.setText(params.title || 'Enter Text');
        modal.modalEl.addClass('ouh-modal');
        
        const content = modal.contentEl;
        content.createEl('p', { text: params.message });
        
        const textInput = content.createEl('input', { type: 'text' });
        if (params.defaultValue) {
            textInput.value = params.defaultValue;
        }
        if (params.placeholder) {
            textInput.placeholder = params.placeholder;
        }
        
        const buttonContainer = content.createEl('div', { cls: 'ouh-button-container' });
        const submitButton = buttonContainer.createEl('button', { 
            text: params.buttonText || 'Next' 
        });
        const cancelButton = buttonContainer.createEl('button', { 
            text: params.cancelText || 'Cancel' 
        });
        
        submitButton.addEventListener('click', () => {
            const value = textInput.value.trim();
            if (params.required && !value) {
                new Notice('❌ Please provide a value');
                return;
            }
            modal.close();
            resolve(value);
        });
        
        cancelButton.addEventListener('click', () => {
            modal.close();
            resolve(null);
        });
        
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitButton.click();
            }
        });
        
        textInput.focus();
        modal.open();
    });
}

/**
 * Creates a select dropdown modal for prompting user selection
 */
export function createSelectPromptModal(
    params: SelectPromptModalParams
): Promise<string | number | null> {
    return new Promise((resolve) => {
        const modal = new Modal(params.app);
        modal.titleEl.setText(params.title || 'Select Option');
        modal.modalEl.addClass('ouh-modal');
        
        const content = modal.contentEl;
        content.createEl('p', { text: params.message });
        
        const selectEl = content.createEl('select');
        params.options.forEach(option => {
            const optionEl = selectEl.createEl('option', { 
                value: option.value.toString(), 
                text: option.text 
            });
            if (option.value === params.defaultValue) {
                optionEl.selected = true;
            }
        });
        
        const buttonContainer = content.createEl('div', { cls: 'ouh-button-container' });
        const submitButton = buttonContainer.createEl('button', { 
            text: params.buttonText || 'Next' 
        });
        const cancelButton = buttonContainer.createEl('button', { 
            text: params.cancelText || 'Cancel' 
        });
        
        submitButton.addEventListener('click', () => {
            const value = selectEl.value;
            // Convert back to number if the original option value was a number
            const selectedOption = params.options.find(opt => opt.value.toString() === value);
            const result = selectedOption ? selectedOption.value : value;
            modal.close();
            resolve(result);
        });
        
        cancelButton.addEventListener('click', () => {
            modal.close();
            resolve(null);
        });
        
        selectEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitButton.click();
            }
        });
        
        selectEl.focus();
        modal.open();
    });
}

/**
 * Creates a textarea modal for prompting longer text input
 */
export function createTextareaPromptModal(
    params: TextareaPromptModalParams
): Promise<string | null> {
    return new Promise((resolve) => {
        const modal = new Modal(params.app);
        modal.titleEl.setText(params.title || 'Enter Description');
        modal.modalEl.addClass('ouh-modal');
        
        const content = modal.contentEl;
        content.createEl('p', { text: params.message });
        
        const textareaEl = content.createEl('textarea');
        if (params.defaultValue) {
            textareaEl.value = params.defaultValue;
        }
        if (params.placeholder) {
            textareaEl.placeholder = params.placeholder;
        }
        if (params.rows) {
            textareaEl.rows = params.rows;
        }
        
        const buttonContainer = content.createEl('div', { cls: 'ouh-button-container' });
        const submitButton = buttonContainer.createEl('button', { 
            text: params.buttonText || 'Submit' 
        });
        const cancelButton = buttonContainer.createEl('button', { 
            text: params.cancelText || 'Cancel' 
        });
        
        submitButton.addEventListener('click', () => {
            const value = textareaEl.value.trim();
            modal.close();
            resolve(value);
        });
        
        cancelButton.addEventListener('click', () => {
            modal.close();
            resolve(null);
        });
        
        if (params.ctrlEnterToSubmit) {
            textareaEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    submitButton.click();
                }
            });
        }
        
        textareaEl.focus();
        modal.open();
    });
}

/**
 * Creates a tags input modal that handles comma-separated values
 */
export function createTagsPromptModal(
    params: TextPromptModalParams
): Promise<string[] | null> {
    return new Promise((resolve) => {
        const modal = new Modal(params.app);
        modal.titleEl.setText(params.title || 'Enter Tags');
        modal.modalEl.addClass('ouh-modal');
        
        const content = modal.contentEl;
        content.createEl('p', { text: params.message });
        
        const tagsInput = content.createEl('input', { type: 'text' });
        if (params.defaultValue) {
            tagsInput.value = params.defaultValue;
        }
        if (params.placeholder) {
            tagsInput.placeholder = params.placeholder;
        }
        
        const buttonContainer = content.createEl('div', { cls: 'ouh-button-container' });
        const submitButton = buttonContainer.createEl('button', { 
            text: params.buttonText || 'Next' 
        });
        const cancelButton = buttonContainer.createEl('button', { 
            text: params.cancelText || 'Cancel' 
        });
        
        submitButton.addEventListener('click', () => {
            const tags = tagsInput.value.trim()
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag);
            modal.close();
            resolve(tags);
        });
        
        cancelButton.addEventListener('click', () => {
            modal.close();
            resolve(null);
        });
        
        tagsInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitButton.click();
            }
        });
        
        tagsInput.focus();
        modal.open();
    });
}

// Convenience functions that replicate the original modal behaviors
export function promptForTitle(app: App, prefilledTitle: string): Promise<string | null> {
    return createTextPromptModal({
        app,
        title: 'Enter Title',
        message: 'Enter the title for your URL resource:',
        placeholder: 'My URL Title',
        defaultValue: prefilledTitle,
        required: true,
        buttonText: 'Next'
    });
}

export function promptForTags(app: App): Promise<string[] | null> {
    return createTagsPromptModal({
        app,
        title: 'Enter Tags',
        message: 'Enter tags for your URL resource (comma-separated):',
        placeholder: 'e.g., tutorial, javascript, web',
        buttonText: 'Next'
    });
}

export function promptForImportance(app: App): Promise<number | null> {
    return createSelectPromptModal({
        app,
        title: 'Select Importance',
        message: 'Select the importance level for your URL resource:',
        options: [
            { value: 1, text: 'Low Priority' },
            { value: 2, text: 'Medium Priority' },
            { value: 3, text: 'High Priority' }
        ],
        defaultValue: 2,
        buttonText: 'Next'
    }) as Promise<number | null>;
}

export function promptForDescription(app: App): Promise<string | null> {
    return createTextareaPromptModal({
        app,
        title: 'Enter Description',
        message: 'Enter a description for your URL resource:',
        placeholder: 'Brief description of this resource...',
        rows: 4,
        buttonText: 'Create Resource File',
        ctrlEnterToSubmit: true
    });
}

/**
 * Utility to prompt the user with retry on InputError.
 * @param promptFn - The async function to call for prompting (should throw InputError on invalid input)
 * @param promptArgs - Arguments to pass to the prompt function
 * @param context - Optional string for error context
 * @param errorDuration - Duration for error notice (default 5000ms)
 * @returns The valid user input, or null if cancelled
 */
export async function promptWithRetry(
    promptFn: (args: any) => Promise<any>,
    promptArgs: any,
    context = '',
    errorDuration = 5000
): Promise<any> {
    while (true) {
        try {
            const result = await promptFn(promptArgs);
            if (result === null || result === undefined) return null; // User cancelled
            // Validation should be inside promptFn or after this call
            return result;
        } catch (error) {
            if (error instanceof InputError) {
                const message = `Invalid input, please amend and try again.\n${error.message || String(error)}`;
                new Notice(message, errorDuration);
                // Loop again for retry
            } else {
                handleError(error, context);
                return null;
            }
        }
    }
}