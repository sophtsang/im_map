import init, { Kernel, Tiler, version } from "./kernel-pkg/kernel_wasm";
export let kernel;
export let tiler;
export const boot = init().then(() => {
    kernel = new Kernel();
    tiler = new Tiler();
}); // this kernel contains the process table
export { version };