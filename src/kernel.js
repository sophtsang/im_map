import init, { Kernel, version } from "./kernel-pkg/kernel_wasm";
export let kernel;
export const boot = init().then(() => {
    kernel = new Kernel();
}); // this kernel contains the process table
export { version };