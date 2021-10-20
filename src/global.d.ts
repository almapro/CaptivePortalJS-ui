import { EventEmitterStatic } from 'eventemitter3';

declare global {
	/**
	* Global files operations' emitter
	*
	* Defined in 'src/global.d.ts'
	* Functions in 'public/filesOperationsEmitter.js'
	*/
	const filesOperationsEmitter: EventEmitterStatic
}
