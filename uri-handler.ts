import { Notice, Plugin, TFile } from "obsidian";
import { FileOperations } from "./test-vault/test-vault/file-operations";

export default class ObsidianUriHandlerPlugin extends Plugin{

    async onload(){

        this.addCommand({
            id: "test-create-file",
            name: "Test: Create File",
            callback: async () => {
                const fileOperator = new FileOperations(this.app);
                const file = await fileOperator.createFile("Test.md", "Test file.");
                if(file instanceof TFile){
                    new Notice("File created successfully.");
                }
                else{
                    new Notice("File creation failed.");
                }
            }
        });
    }
}