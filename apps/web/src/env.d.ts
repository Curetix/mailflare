/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Built into a Mailflare Worker (`vite build --mode worker`). */
    readonly VITE_LOCKED_WORKER: boolean;
}
