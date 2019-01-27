import * as Mobx from 'mobx';
import * as _ from 'lodash';
import { Project } from './project';
import { LibraryStoreItem } from './library-store-item';
import * as T from '../types';

export interface LibraryStoreInit {
	project?: Project;
}

export class LibraryStore {
	private readonly recommended = [
		{
			name: '@meetalva/designkit',
			version: 'latest'
		},
		{
			name: '@material-ui/core',
			version: '3.9.0'
		}
	];

	@Mobx.observable private project?: Project;
	@Mobx.observable private internalInstalledOpen: boolean = false;

	@Mobx.computed
	private get items(): LibraryStoreItem[] {
		if (!this.project) {
			return [];
		}

		const derived = this.project
			.getPatternLibraries()
			.map(lib => LibraryStoreItem.fromLibrary(lib))
			.sort((a, b) => {
				if (a.origin === T.PatternLibraryOrigin.BuiltIn) {
					return 1;
				}

				if (b.origin === T.PatternLibraryOrigin.BuiltIn) {
					return -1;
				}

				return (a.name || '').localeCompare(b.name || '');
			});

		const data = [...this.recommendations, ...derived];
		return _.uniqBy(data, 'packageName');
	}

	@Mobx.computed
	public get recommendations(): LibraryStoreItem[] {
		return this.recommended.map(name =>
			LibraryStoreItem.fromRecommendation(name, { project: this.project })
		);
	}

	@Mobx.computed
	public get withLibrary(): LibraryStoreItem[] {
		return this.items.filter(item => item.hasLibrary);
	}

	@Mobx.computed
	public get withUpdate(): LibraryStoreItem[] {
		return this.withLibrary.filter(item => item.hasUpdate);
	}

	@Mobx.computed
	public get updateCount(): number {
		return this.withLibrary.filter(item => item.hasUpdate).length;
	}

	@Mobx.computed
	public get installedOpen(): boolean {
		return this.updateCount > 0 || this.internalInstalledOpen;
	}

	public set installedOpen(open: boolean) {
		this.internalInstalledOpen = open;
	}

	public constructor(init?: LibraryStoreInit) {
		this.project = init ? init.project : undefined;

		Mobx.autorun(() => {
			this.withLibrary.forEach(lib => lib.checkForUpdate());
		});

		setInterval(() => this.checkForUpdates(), 5 * 60 * 1000);
	}

	public getItemByPackageName(name: string): LibraryStoreItem | undefined {
		return this.items.find(item => item.packageName === name);
	}

	@Mobx.action
	public setProject(project: Project): void {
		this.project = project;
	}

	@Mobx.action
	public checkForUpdates(): void {
		this.items.forEach(item => item.checkForUpdate());
	}
}

export enum LibraryStoreItemType {
	Recommended = 'library-store-item-type-recommended',
	Remote = 'library-store-item-remote',
	Local = 'library-store-item-local'
}

export enum LibraryStoreItemState {
	Unknown = 'library-store-item-state-unknown',
	Listed = 'library-store-item-state-listed',
	Installing = 'library-store-item-state-installing',
	Installed = 'library-store-item-state-installed',
	NeedsUpdate = 'library-store-item-needs-update'
}
