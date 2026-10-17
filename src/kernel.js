import init, { Kernel, version } from "./kernel-pkg/kernel_wasm";
export let kernel;
export const boot = init().then(() => {
    kernel = new Kernel();
});
export { version };