import { Notice } from 'obsidian';

export class FileError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FileError';
    }
}

export class InputError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InputError';
    }
}

export class RuntimeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RuntimeError';
    }
}

/**
 * Show a user-facing error notice and log the error to the console with context.
 * Recognizes FileError, InputError, and RuntimeError for more specific notices.
 * @param error - The error object or message
 * @param context - Optional string describing where the error occurred
 */
export function handleError(error: any, context?: string) {
    const message = error instanceof Error ? error.message : String(error);
    let prefix = context ? `[${context}] ` : '';
    if (error instanceof FileError) {
        prefix = `[File Error] ${prefix}`;
    } else if (error instanceof InputError) {
        prefix = `[Input Error] ${prefix}`;
    } else if (error instanceof RuntimeError) {
        prefix = `[Runtime Error] ${prefix}`;
    }
    new Notice(`❌ ${prefix}${message}`);
    if (context) {
        console.error(`${prefix}${message}`, error);
    } else {
        console.error(message, error);
    }
}

/**
 * Show a user-facing success notice.
 * @param message - The message to show
 * @param context - Optional string describing the context
 */
export function showSuccess(message: string, context?: string) {
    const prefix = context ? `[${context}] ` : '';
    new Notice(`✅ ${prefix}${message}`);
} 