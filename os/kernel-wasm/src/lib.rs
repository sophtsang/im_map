use wasm_bindgen::prelude::*;
use kernel::process::table::ProcessTable;

#[wasm_bindgen]
pub fn version() -> String {
    "im_map kernel 0.1.0".into()
}

#[wasm_bindgen]
pub struct Kernel { processes: ProcessTable }

#[wasm_bindgen]
impl Kernel{
    #[wasm_bindgen(constructor)]
    pub fn new() -> Kernel { Kernel { processes: ProcessTable::new() } }

    pub fn spawn(&mut self, ppid: u32, entry: String) -> u32 { self.processes.spawn(ppid, entry) }
    pub fn kill(&mut self, pid: u32) -> Result<(), JsError> { Ok(self.processes.kill(pid)?) }
    pub fn wait(&mut self, ppid: u32, pid: u32) -> Result<i32, JsError> { Ok(self.processes.wait(ppid, pid)?) }
    pub fn ps(&self) -> Result<JsValue, JsError> { Ok(serde_wasm_bindgen::to_value(&self.processes.ps())?) }
}