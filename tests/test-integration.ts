import { App, Notice } from 'obsidian';
import { runFileOperationsTests } from './file-operations-test';

/**
 * Test Integration
 * 
 * This file shows how to integrate the test suite into your main plugin.
 * You can call these functions from your plugin's commands or settings.
 */

export class TestIntegration {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Add test commands to your plugin
	 * Call this in your plugin's onload() method
	 */
	addTestCommands(plugin: any): void {
		// Command to run all tests
		plugin.addCommand({
			id: 'run-file-operations-tests',
			name: 'Run File Operations Tests',
			callback: async () => {
				console.log('🧪 Starting File Operations Test Suite...');
				await runFileOperationsTests(this.app);
				new Notice('✅ File operations tests completed! Check console for details.');
			}
		});

		// Command to run individual test categories
		plugin.addCommand({
			id: 'test-file-creation',
			name: 'Test File Creation',
			callback: async () => {
				console.log('📝 Testing file creation...');
				const { FileOperationsTest } = await import('./file-operations-test');
				const testSuite = new FileOperationsTest(this.app);
				await testSuite.testCreateFile();
				new Notice('✅ File creation tests completed!');
			}
		});

		plugin.addCommand({
			id: 'test-file-operations',
			name: 'Test File Operations (CRUD)',
			callback: async () => {
				console.log('🔄 Testing CRUD operations...');
				const { FileOperationsTest } = await import('./file-operations-test');
				const testSuite = new FileOperationsTest(this.app);
				
				// Run core CRUD tests
				await testSuite.testCreateFile();
				await testSuite.testReadFile();
				await testSuite.testUpdateFile();
				await testSuite.testDeleteFile();
				
				new Notice('✅ CRUD operations tests completed!');
			}
		});

		plugin.addCommand({
			id: 'test-error-handling',
			name: 'Test Error Handling',
			callback: async () => {
				console.log('⚠️ Testing error handling...');
				const { FileOperationsTest } = await import('./file-operations-test');
				const testSuite = new FileOperationsTest(this.app);
				await testSuite.testErrorHandling();
				new Notice('✅ Error handling tests completed!');
			}
		});
	}

	/**
	 * Quick test function for development
	 * Use this during development to quickly test your functions
	 */
	async quickTest(): Promise<void> {
		console.log('⚡ Running quick test...');
		
		const { FileOperations } = await import('../test-vault/test-vault/file-operations');
		const fileOps = new FileOperations(this.app);

		try {
			// Quick create and read test
			const testFile = await fileOps.createFile('quick-test.md', '# Quick Test\n\nThis is a quick test.');
			if (testFile) {
				console.log('✅ Created test file');
				
				const content = await fileOps.readFile('quick-test.md');
				if (content && content.includes('Quick Test')) {
					console.log('✅ Read test file successfully');
				}
				
				// Clean up
				await fileOps.deleteFile('quick-test.md');
				console.log('✅ Cleaned up test file');
			}
		} catch (error) {
			console.error('❌ Quick test failed:', error);
		}
	}

	/**
	 * Performance test
	 * Test how your functions perform with larger files
	 */
	async performanceTest(): Promise<void> {
		console.log('⚡ Running performance test...');
		
		const { FileOperations } = await import('../test-vault/test-vault/file-operations');
		const fileOps = new FileOperations(this.app);

		try {
			// Create a large file
			const largeContent = '# Large Test File\n\n' + 'This is line '.repeat(1000);
			const startTime = Date.now();
			
			const largeFile = await fileOps.createFile('performance-test.md', largeContent);
			const createTime = Date.now() - startTime;
			
			if (largeFile) {
				console.log(`✅ Created large file in ${createTime}ms`);
				
				// Test read performance
				const readStart = Date.now();
				const readContent = await fileOps.readFile('performance-test.md');
				const readTime = Date.now() - readStart;
				
				console.log(`✅ Read large file in ${readTime}ms`);
				console.log(`📊 File size: ${readContent?.length || 0} characters`);
				
				// Clean up
				await fileOps.deleteFile('performance-test.md');
				console.log('✅ Cleaned up performance test file');
			}
		} catch (error) {
			console.error('❌ Performance test failed:', error);
		}
	}
}

/**
 * Example usage in your main plugin:
 * 
 * // In your main.ts onload() method:
 * const testIntegration = new TestIntegration(this.app);
 * testIntegration.addTestCommands(this);
 * 
 * // Or run a quick test:
 * await testIntegration.quickTest();
 */ 