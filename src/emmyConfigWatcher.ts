import * as vs from "vscode";

export enum UpdateType {
    Created,
    Changed,
    Deleted
}

const pattern = '**/emmy.config.json';

export interface IEmmyConfigSource {
    uri: string;
    workspace: string;
}

export interface IEmmyConfigUpdate {
    type: UpdateType;
    source: IEmmyConfigSource;
}

export class EmmyConfigWatcher implements vs.Disposable {

    private watcher?: vs.FileSystemWatcher;
    private emitter = new vs.EventEmitter<IEmmyConfigUpdate>();
    private configFiles: IEmmyConfigSource[] = [];

    get onConfigUpdate(): vs.Event<IEmmyConfigUpdate> {
        return this.emitter.event;
    }

    async watch() {
        const files = await vs.workspace.findFiles(pattern);
        const configFiles: IEmmyConfigSource[] = [];
        for (let i = 0; i < files.length; i++) {
            const fileUri = files[i];
            const ws = await vs.workspace.getWorkspaceFolder(fileUri);
            if (ws) {
                configFiles.push({ workspace: ws.uri.toString(), uri: fileUri.toString() });
            }
        }

        this.watcher = vs.workspace.createFileSystemWatcher(pattern);
        this.watcher.onDidCreate(uri => this.updateConfig(UpdateType.Created, uri));
        this.watcher.onDidChange(uri => this.updateConfig(UpdateType.Changed, uri));
        this.watcher.onDidDelete(uri => this.updateConfig(UpdateType.Deleted, uri));

        this.configFiles = configFiles;
        return configFiles;
    }

    private findConfig(uri: vs.Uri): IEmmyConfigSource | undefined {
        return this.configFiles.find(it => it.uri === uri.toString());
    }

    private async updateConfig(type: UpdateType, uri: vs.Uri) {
        let config = this.findConfig(uri);
        if (config) {
            if (type === UpdateType.Deleted) {
                const index = this.configFiles.indexOf(config);
                this.configFiles.splice(index, 1);
            }
        }
        else {
            const ws = await vs.workspace.getWorkspaceFolder(uri);
            if (!ws) {
                return;
            }
            config = { workspace: ws.uri.toString(), uri: uri.toString() };
            this.configFiles.push(config);
            type = UpdateType.Created;
        }
        this.emitter.fire({ type: type, source: config });
    }

    dispose() {
        if (this.watcher) {
            this.watcher.dispose();
            this.watcher = undefined;
        }
    }
}