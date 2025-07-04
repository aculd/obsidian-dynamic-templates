# Obsidian Dynamic Templates

## 🚀 Overview

Obsidian Dynamic Templates is a modular, extensible system for creating, managing, and automating resource and note templates in Obsidian. It features dynamic template discovery, automatic command registration, robust modal utilities, and centralized error handling for a seamless user and developer experience.

---

## ✨ Features

- **Dynamic Template Discovery:**
  - Scans the `Scripts/` folder for template scripts and auto-registers commands for each.
  - Add new templates by simply dropping a script in `Scripts/`—no manual code changes required.

- **Abstract Template System:**
  - All templates extend a base `Template` class, enforcing required parameters (`title`, `url`, `type`) and providing shared utilities.
  - Add new templates by subclassing and implementing two methods: `createTemplatedFile` and `promptForFields`.

- **Reusable Modal Utilities:**
  - All user prompts use modular modal functions (text, dropdown, textarea, etc.) from `modals.ts`.
  - The `promptWithRetry` utility allows users to correct input errors without breaking the flow.

- **Centralized Error Handling:**
  - All errors are handled via `handleError` from `errors.ts`.
  - Custom error types (`InputError`, `FileError`, `RuntimeError`) provide clear, actionable feedback.
  - Input errors prompt the user to try again, while other errors are surfaced and logged.

- **Extensibility & Modularity:**
  - New templates can be added by subclassing `Template` and implementing two methods.
  - All scripts and commands use the same robust, user-friendly patterns.

---

## 🧑‍💻 How to Implement a New Template

1. **Create a new script in the `Scripts/` folder** (e.g., `MyTemplate.js`).
2. **Export a class named `<Type>Template`** (e.g., `MyTemplateTemplate`) that extends `Template` from `../Template`.
3. **Implement:**
   - `createTemplatedFile(app, params)` (main logic for file creation)
   - `promptForFields(app, prefilledTitle)` (user prompts for required fields)
4. **Set your template string** using `this.setResourceTemplate()` in the constructor.
5. **Required params:** Your template must use `title`, `url`, and `type` as default parameters.
6. **Done!** The plugin will automatically register a command: `Create MyTemplate File (Dynamic)`.

---

## 🛠️ Example Template Script
```js
import { Template } from '../Template';
export class MyTemplateTemplate extends Template {
    constructor() {
        super();
        this.setResourceTemplate('...your template string...');
    }
    async createTemplatedFile(app, params) {
        Template.enforceTitleUrlType(params);
        // ...your logic...
    }
    async promptForFields(app, prefilledTitle) {
        // ...your prompts using promptWithRetry and modal utilities...
    }
}
```

---

## 🏗️ Program Structure

```
obsidian-dynamic-templates/
├── main.ts              # Main plugin entry point (dynamic command registration, plugin lifecycle)
├── manifest.json        # Plugin manifest (name, id, description, version)
├── package.json         # NPM package config
├── Template.ts          # Abstract Template class (base for all templates)
├── modals.ts            # Modular modal utilities (text, dropdown, textarea, retry logic)
├── errors.ts            # Centralized error types and error handling
├── Scripts/             # Folder for all template scripts (auto-discovered)
├── tests/               # Test suites and helpers
├── styles.css           # Scoped plugin styles
├── ...                  # Other build/config files
```

---

## 🧩 Custom Classes & Modules

- **`Template` (Template.ts):**
  - Abstract base class for all templates.
  - Enforces required params (`title`, `url`, `type`).
  - Provides `writeToFile` utility and static validation helpers.

- **Modal Utilities (modals.ts):**
  - `createTextPromptModal`, `createSelectPromptModal`, `createTextareaPromptModal`, etc.
  - `promptWithRetry` for robust, retryable user input.
  - All modals are styled and scoped for plugin safety.

- **Error Handling (errors.ts):**
  - Custom error types: `InputError`, `FileError`, `RuntimeError`.
  - `handleError` utility for user-facing notices and console logging.
  - `showSuccess` for consistent success feedback.

- **Dynamic Command Registration (main.ts):**
  - Scans `Scripts/` for `.js` files on plugin load.
  - Loads each `<Type>Template` class and registers a command: `Create <Type> File (Dynamic)`.
  - Running the command instantiates the template and calls `createTemplatedFile`.

---

## 📚 See Also
- `Template.ts`, `modals.ts`, and `errors.ts` for advanced patterns and utilities.
- Example scripts in `Scripts/` for real-world template implementations.

---

Happy templating! 🚀

## Installation

### From Obsidian

1. Open Settings > Third-party plugin
2. Disable Safe mode
3. Click Browse community plugins
4. Search for "Obsidian Dynamic Templates"
5. Click Install
6. After installation, close the community plugins window and activate the newly installed plugin

### Manual Installation

1. Download the latest release
2. Extract the zip file
3. Copy the extracted folder to your vault's plugins folder: `<vault>/.obsidian/plugins/`
4. Reload Obsidian
5. If prompted about Safe Mode, you can disable safe mode and enable the plugin

## Development

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Commands

- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build for production
- `npm run version` - Bump version and update manifest

### Customization

1. **Update manifest.json**: Change the plugin ID, name, description, and author information
2. **Modify main.ts**: Update the plugin class name and implement your desired functionality
3. **Add settings**: Extend the settings interface and add new setting controls
4. **Add commands**: Create new commands using `this.addCommand()`
5. **Add UI elements**: Use ribbon icons, status bar items, or modals

## API Reference

This plugin uses the Obsidian Plugin API. Key classes and methods:

- `Plugin` - Base class for all plugins
- `PluginSettingTab` - Base class for settings tabs
- `Modal` - Base class for modal dialogs
- `Notice` - For showing notifications
- `App` - Main application instance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues or have questions, please:

1. Check the [Issues](https://github.com/aculd/obsidian-dynamic-templates/issues) page
2. Create a new issue with detailed information about your problem
3. Include your Obsidian version and operating system

## Changelog

### 1.0.0
- Initial release
- Modular, dynamic template system
- Settings tab implementation
- Command palette integration 