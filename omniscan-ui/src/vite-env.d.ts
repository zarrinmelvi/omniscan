/// <reference types="vite/client" />
declare module '*.vue' {
	import type { DefineComponent } from 'vue'
	// Use Record<string, any> instead of {} to satisfy ESLint
	const component: DefineComponent<Record<string, any>, Record<string, any>, any>
	export default component
}
