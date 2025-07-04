import { App, TFile, Notice } from 'obsidian';
import { FileOperations } from '../test-vault/test-vault/file-operations';

/**
 * File Operations Test Suite
 * 
 * This file contains comprehensive tests for the FileOperations class.
 * Each test function focuses on a specific operation and includes edge cases.
 */

export class FileOperationsTest {
	private fileOps: FileOperations;
	private testFiles: string[] = [];
	private logBuffer: string[] = [];
	private app: App;

	constructor(app: App) {
		this.app = app;
		this.fileOps = new FileOperations(app);
	}

	private log(msg: string) {
		this.logBuffer.push(msg);
	}

	/**
	 * Run all tests
	 */
	async runAllTests(): Promise<void> {
		this.log('# 🧪 File Operations Test Results\n');
		try {
			await this.testCreateFile();
			await this.testReadFile();
			await this.testUpdateFile();
			await this.testAppendToFile();
			await this.testFileExists();
			await this.testGetFileMetadata();
			await this.testOpenFilePath();
			await this.testDeleteFile();
			await this.testErrorHandling();
			this.log('\n✅ All tests completed successfully!');
		} catch (error) {
			this.log(`\n❌ Test suite failed: ${error}`);
		} finally {
			await this.cleanupTestFiles();
			await this.writeResultsToVault();
		}
	}

	private async writeResultsToVault() {
		const fileName = 'file-operations-test.md';
		const content = this.logBuffer.join('\n');
		const existing = this.app.vault.getAbstractFileByPath(fileName);
		if (existing && existing instanceof TFile) {
			await this.app.vault.modify(existing, content);
		} else {
			await this.app.vault.create(fileName, content);
		}
	}

	/**
	 * Test file creation functionality
	 */
	async testCreateFile(): Promise<void> {
		this.log('## 📝 Testing createFile...');

		// Test 1: Create file with content
		const testFile1 = await this.fileOps.createFile('test-create-1.md', '# Test File\n\nThis is test content.');
		if (!testFile1) {
			throw new Error('Failed to create test file 1');
		}
		this.testFiles.push('test-create-1.md');
		this.log('  ✅ Created file with content: ' + testFile1.path);

		// Test 2: Create file with empty content
		const testFile2 = await this.fileOps.createFile('test-create-2.md');
		if (!testFile2) {
			throw new Error('Failed to create test file 2');
		}
		this.testFiles.push('test-create-2.md');
		this.log('  ✅ Created file with empty content: ' + testFile2.path);

		// Test 3: Create file in subfolder
		const testFile3 = await this.fileOps.createFile('test-folder/test-create-3.md', 'Subfolder test');
		if (!testFile3) {
			throw new Error('Failed to create test file in subfolder');
		}
		this.testFiles.push('test-folder/test-create-3.md');
		this.log('  ✅ Created file in subfolder: ' + testFile3.path);

		// Test 4: Try to create duplicate file (should fail gracefully)
		const duplicateFile = await this.fileOps.createFile('test-create-1.md', 'Duplicate content');
		if (duplicateFile) {
			this.log('  ⚠️  Duplicate file creation succeeded (unexpected)');
		} else {
			this.log('  ✅ Duplicate file creation properly rejected');
		}

		this.log('  🎉 createFile tests passed!\n');
	}

	/**
	 * Test file reading functionality
	 */
	async testReadFile(): Promise<void> {
		this.log('## 📖 Testing readFile...');

		// Test 1: Read existing file
		const content = await this.fileOps.readFile('test-create-1.md');
		if (content && content.includes('Test File')) {
			this.log('  ✅ Successfully read file content');
		} else {
			throw new Error('Failed to read file content');
		}

		// Test 2: Read non-existent file
		const nonExistentContent = await this.fileOps.readFile('non-existent-file.md');
		if (nonExistentContent === null) {
			this.log('  ✅ Properly handled non-existent file');
		} else {
			throw new Error('Should return null for non-existent file');
		}

		// Test 3: Read empty file
		const emptyContent = await this.fileOps.readFile('test-create-2.md');
		if (emptyContent === '') {
			this.log('  ✅ Successfully read empty file');
		} else {
			throw new Error('Failed to read empty file correctly');
		}

		this.log('  🎉 readFile tests passed!\n');
	}

	/**
	 * Test file updating functionality
	 */
	async testUpdateFile(): Promise<void> {
		this.log('## ✏️  Testing updateFile...');

		// Test 1: Update existing file
		const updateSuccess = await this.fileOps.updateFile('test-create-1.md', '# Updated File\n\nThis is updated content.');
		if (updateSuccess) {
			this.log('  ✅ Successfully updated file');
		} else {
			throw new Error('Failed to update file');
		}

		// Verify the update
		const updatedContent = await this.fileOps.readFile('test-create-1.md');
		if (updatedContent && updatedContent.includes('Updated File')) {
			this.log('  ✅ Update content verified');
		} else {
			throw new Error('File content was not properly updated');
		}

		// Test 2: Try to update non-existent file
		const updateNonExistent = await this.fileOps.updateFile('non-existent-update.md', 'New content');
		if (!updateNonExistent) {
			this.log('  ✅ Properly handled update of non-existent file');
		} else {
			throw new Error('Should return false for non-existent file update');
		}

		this.log('  🎉 updateFile tests passed!\n');
	}

	/**
	 * Test file appending functionality
	 */
	async testAppendToFile(): Promise<void> {
		this.log('## ➕ Testing appendToFile...');

		// Test 1: Append to existing file
		const appendSuccess = await this.fileOps.appendToFile('test-create-1.md', '\n## Appended Section\n\nThis was appended.');
		if (appendSuccess) {
			this.log('  ✅ Successfully appended to file');
		} else {
			throw new Error('Failed to append to file');
		}

		// Verify the append
		const appendedContent = await this.fileOps.readFile('test-create-1.md');
		if (appendedContent && appendedContent.includes('Appended Section')) {
			this.log('  ✅ Append content verified');
		} else {
			throw new Error('File content was not properly appended');
		}

		// Test 2: Try to append to non-existent file
		const appendNonExistent = await this.fileOps.appendToFile('non-existent-append.md', 'Append content');
		if (!appendNonExistent) {
			this.log('  ✅ Properly handled append to non-existent file');
		} else {
			throw new Error('Should return false for non-existent file append');
		}

		this.log('  🎉 appendToFile tests passed!\n');
	}

	/**
	 * Test file existence checking
	 */
	async testFileExists(): Promise<void> {
		this.log('🔍 Testing fileExists...');

		// Test 1: Check existing file
		const exists = this.fileOps.fileExists('test-create-1.md');
		if (exists) {
			this.log('  ✅ Correctly identified existing file');
		} else {
			throw new Error('Failed to detect existing file');
		}

		// Test 2: Check non-existent file
		const notExists = this.fileOps.fileExists('non-existent-check.md');
		if (!notExists) {
			this.log('  ✅ Correctly identified non-existent file');
		} else {
			throw new Error('Incorrectly detected non-existent file');
		}

		// Test 3: Check file in subfolder
		const subfolderExists = this.fileOps.fileExists('test-folder/test-create-3.md');
		if (subfolderExists) {
			this.log('  ✅ Correctly identified file in subfolder');
		} else {
			throw new Error('Failed to detect file in subfolder');
		}

		this.log('  🎉 fileExists tests passed!\n');
	}

	/**
	 * Test file metadata retrieval
	 */
	async testGetFileMetadata(): Promise<void> {
		this.log('📊 Testing getFileMetadata...');

		// Test 1: Get metadata for existing file
		const metadata = this.fileOps.getFileMetadata('test-create-1.md');
		if (metadata) {
			this.log('  ✅ Successfully retrieved file metadata');
			this.log(`    Name: ${metadata.name}`);
			this.log(`    Path: ${metadata.path}`);
			this.log(`    Size: ${metadata.size} bytes`);
			this.log(`    Modified: ${metadata.modified}`);
		} else {
			throw new Error('Failed to get file metadata');
		}

		// Test 2: Get metadata for non-existent file
		const nonExistentMetadata = this.fileOps.getFileMetadata('non-existent-metadata.md');
		if (nonExistentMetadata === null) {
			this.log('  ✅ Properly handled metadata for non-existent file');
		} else {
			throw new Error('Should return null for non-existent file metadata');
		}

		// Test 3: Verify metadata properties
		if (metadata && typeof metadata.name === 'string' && 
			typeof metadata.path === 'string' && 
			typeof metadata.size === 'number' && 
			metadata.modified instanceof Date) {
			this.log('  ✅ Metadata properties are correct types');
		} else {
			throw new Error('Metadata properties have incorrect types');
		}

		this.log('  🎉 getFileMetadata tests passed!\n');
	}

	/**
	 * Test file opening functionality
	 */
	async testOpenFilePath(): Promise<void> {
		this.log('🔓 Testing openFilePath...');

		// Test 1: Open existing file
		const openedFile = await this.fileOps.openFilePath('test-create-1.md');
		if (openedFile) {
			this.log('  ✅ Successfully opened file by path: ' + openedFile.path);
		} else {
			throw new Error('Failed to open existing file');
		}

		// Test 2: Try to open non-existent file
		const nonExistentOpened = await this.fileOps.openFilePath('non-existent-open.md');
		if (nonExistentOpened === null) {
			this.log('  ✅ Properly handled opening non-existent file');
		} else {
			throw new Error('Should return null for non-existent file open');
		}

		// Test 3: Open file using TFile object
		if (openedFile) {
			const openedByFile = await this.fileOps.openFile(openedFile);
			if (openedByFile) {
				this.log('  ✅ Successfully opened file using TFile object');
			} else {
				throw new Error('Failed to open file using TFile object');
			}
		}

		this.log('  🎉 openFilePath tests passed!\n');
	}

	/**
	 * Test file deletion functionality
	 */
	async testDeleteFile(): Promise<void> {
		this.log('🗑️  Testing deleteFile...');

		// Create a file specifically for deletion test
		const deleteTestFile = await this.fileOps.createFile('test-delete.md', 'This file will be deleted');
		if (!deleteTestFile) {
			throw new Error('Failed to create file for deletion test');
		}

		// Test 1: Delete existing file
		const deleteSuccess = await this.fileOps.deleteFile('test-delete.md');
		if (deleteSuccess) {
			this.log('  ✅ Successfully deleted file');
		} else {
			throw new Error('Failed to delete file');
		}

		// Verify deletion
		const stillExists = this.fileOps.fileExists('test-delete.md');
		if (!stillExists) {
			this.log('  ✅ File deletion verified');
		} else {
			throw new Error('File still exists after deletion');
		}

		// Test 2: Try to delete non-existent file
		const deleteNonExistent = await this.fileOps.deleteFile('non-existent-delete.md');
		if (!deleteNonExistent) {
			this.log('  ✅ Properly handled deletion of non-existent file');
		} else {
			throw new Error('Should return false for non-existent file deletion');
		}

		this.log('  🎉 deleteFile tests passed!\n');
	}

	/**
	 * Test error handling scenarios
	 */
	async testErrorHandling(): Promise<void> {
		this.log('⚠️  Testing error handling...');

		// Test 1: Invalid file path
		const invalidPath = await this.fileOps.createFile('', 'Invalid path test');
		if (invalidPath === null) {
			this.log('  ✅ Properly handled invalid file path');
		} else {
			this.log('  ⚠️  Invalid path was accepted (may be platform-specific)');
		}

		// Test 2: Very long file path
		const longPath = 'a'.repeat(1000) + '.md';
		const longPathResult = await this.fileOps.createFile(longPath, 'Long path test');
		if (longPathResult === null) {
			this.log('  ✅ Properly handled very long file path');
		} else {
			this.log('  ⚠️  Very long path was accepted');
			this.testFiles.push(longPath);
		}

		// Test 3: Special characters in path
		const specialCharsPath = 'test-special-<>:"|?*.md';
		const specialCharsResult = await this.fileOps.createFile(specialCharsPath, 'Special chars test');
		if (specialCharsResult === null) {
			this.log('  ✅ Properly handled special characters in path');
		} else {
			this.log('  ⚠️  Special characters in path were accepted');
			this.testFiles.push(specialCharsPath);
		}

		this.log('  🎉 error handling tests passed!\n');
	}

	/**
	 * Clean up test files
	 */
	async cleanupTestFiles(): Promise<void> {
		this.log('🧹 Cleaning up test files...');

		for (const filePath of this.testFiles) {
			try {
				await this.fileOps.deleteFile(filePath);
				this.log(`  ✅ Deleted: ${filePath}`);
			} catch (error) {
				this.log(`  ⚠️  Could not delete: ${filePath} (${error})`);
			}
		}

		// Clean up test folder if empty
		try {
			await this.fileOps.deleteFile('test-folder/test-create-3.md');
			this.log('  ✅ Cleaned up test folder');
		} catch (error) {
			this.log('  ⚠️  Could not clean up test folder');
		}

		this.log('  🎉 Cleanup completed!\n');
	}
}

/**
 * Convenience function to run tests
 */
export async function runFileOperationsTests(app: App): Promise<void> {
	const testSuite = new FileOperationsTest(app);
	await testSuite.runAllTests();
} 