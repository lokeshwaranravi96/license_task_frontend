/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_KEY: string
  readonly VITE_AUTH_HEADER: string
  readonly VITE_TOKEN_HEADER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
