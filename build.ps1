# Build the plugin
npm run build

# Copy plugin files to the test vault plugin directory
Copy-Item -Force main.js "C:\Users\a\dev\obsidian-uri-handler\test-vault\test-vault\.obsidian\plugins\obsidian-uri-handler\"
Copy-Item -Force manifest.json "C:\Users\a\dev\obsidian-uri-handler\test-vault\test-vault\.obsidian\plugins\obsidian-uri-handler\"
if (Test-Path styles.css) { Copy-Item -Force styles.css "C:\Users\a\dev\obsidian-uri-handler\test-vault\test-vault\.obsidian\plugins\obsidian-uri-handler\" }

# Copy Scripts folder contents to VAULT_PATH/Scripts/
$vaultScripts = "C:\Users\a\dev\obsidian-uri-handler\test-vault\test-vault\Scripts"
if (!(Test-Path $vaultScripts)) { New-Item -ItemType Directory -Path $vaultScripts | Out-Null }
Copy-Item -Force -Recurse -Path "Scripts\*" -Destination $vaultScripts

# Copy create-url-file-modular.ts to the Scripts folder in the test vault
Copy-Item -Force create-url-file-modular.ts $vaultScripts 