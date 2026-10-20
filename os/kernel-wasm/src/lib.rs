use wasm_bindgen::prelude::*;
use kernel::process::table::ProcessTable;
use wm::dwindle::DwindleTree;
use wm::dwindle::Rectangle;

#[wasm_bindgen]
pub fn version() -> String {
    "kernel_bsod 0.1.0, CTRL + ALT + T to terminal".into()
}

#[wasm_bindgen]
pub struct Kernel { processes: ProcessTable }

#[wasm_bindgen]
impl Kernel {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Kernel { Kernel { processes: ProcessTable::new() } }

    pub fn spawn(&mut self, ppid: u32, entry: String) -> u32 { self.processes.spawn(ppid, entry) }
    pub fn kill(&mut self, pid: u32) -> Result<(), JsError> { Ok(self.processes.kill(pid)?) }
    pub fn wait(&mut self, ppid: u32, pid: u32) -> Result<i32, JsError> { Ok(self.processes.wait(ppid, pid)?) }
    pub fn ps(&self) -> Result<JsValue, JsError> { Ok(serde_wasm_bindgen::to_value(&self.processes.ps())?) }
}

#[wasm_bindgen]
pub struct Tiler { tiler: DwindleTree }

#[wasm_bindgen]
impl Tiler {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Tiler { Tiler { tiler: DwindleTree::new() } }
    pub fn insert(&mut self, fpid: Option<u32>, npid: u32, ratio: Option<f32>) -> Result<(), JsError> {
        Ok(self.tiler.insert(fpid, npid, ratio)?)
    } 
    pub fn remove(&mut self, pid: u32) -> Result<(), JsError> {
        Ok(self.tiler.remove(pid)?)
    }
    pub fn layout(&self, window: JsValue) -> Result<JsValue, JsError> { 
        let window: Rectangle = serde_wasm_bindgen::from_value(window)?;
        Ok(serde_wasm_bindgen::to_value(&self.tiler.layout(window))?)
    }
}