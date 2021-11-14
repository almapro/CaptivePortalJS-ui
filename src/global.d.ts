import EventEmitter from 'events';

type FileType = 'handshakes' | 'pictures';

declare global {
	interface Window {
		/**
		 * Global files operations
		 *
		 * Defined in 'src/global.d.ts'
		 * Functions in 'public/preload.js'
		 */
		files: {
			upload: (nodeId: string, fileType: FileType, filename: string, content: any) => string
			list: (nodeId: string, filesType: FileType) => string[]
			delete: (nodeId: string, fileType: FileType, filename: string) => void
		}
	}
}
