/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MODE?: 'ADMIN' | 'CLIENT'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // Use Record<string, any> instead of {} to satisfy ESLint
  const component: DefineComponent<Record<string, any>, Record<string, any>, any>
  export default component
}
