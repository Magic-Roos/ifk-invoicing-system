/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // more env variables here...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
