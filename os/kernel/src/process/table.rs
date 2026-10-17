// Process Table containing all active processes
// when process becomes zombie and parent calls wait(pid), reads exit_code -> delete
// from table (hashmap)
use std::collections::BinaryHeap;
use std::cmp::Reverse;
use std::collections::BTreeMap; // want sorted pids

use super::{Pcb, Pid, ProcessEvent, ProcessState};
use crate::error::KernelError;

pub struct ProcessTable {
    table : BTreeMap<Pid, Pcb>,
    freed_pids : BinaryHeap<Reverse<Pid>>,
    next_unused : Pid
} 

impl ProcessTable {
    pub fn new() -> Self {
        // create parent process pid 1 at boot
        let parent = Pcb::new(1, 0, String::from("init/desktop")); // made up an entry here
        let mut table = BTreeMap::new();
        table.insert(1, parent);

        Self {
            table : table,
            freed_pids : BinaryHeap::new(),
            next_unused : 2
        }
    }

    pub fn spawn(&mut self, ppid : Pid, entry : String) -> Pid {
        // pids only increase (given that we aren't reusing any rn)
        // or tbh we can just have a minheap of reusable pids, where 
        // new pid is either pop from minheap, or next new pid
        // free_pids : minheap
        // next_unused : next never used before pid
        let pid = match self.freed_pids.pop() {
            Some(Reverse(next_pid)) => next_pid,
            None => {
                self.next_unused += 1;
                self.next_unused - 1
            }
        };

        let process = Pcb::new(pid, ppid, entry);
        self.table.insert(pid, process);
        // parent gets the pid of its child
        pid
    }

    // this is called by the parent, who has the child pid -> kills the child
    pub fn kill(&mut self, pid : Pid) -> Result<(), KernelError> {
        // todo!("kill process w/ pid and then call transition w/ event Kill")
        match self.table.get_mut(&pid) {
            Some(process) => process.transition(ProcessEvent::Kill),
            None => Err(KernelError::NoSuchProcess(pid))
        }
    }

    pub fn wait(&mut self, ppid : Pid, pid : Pid) -> Result<i32, KernelError> {
        // Ok(exit_code)
        // blocking call that blocks until specific (no arbitrary) child exits or killed
        // parent process goes to Waiting
        // TODO: add this bak later
        // match self.table[ppid] {
        //     Some(parent) => parent.transition(ProcessEvent::Block),
        //     None => return Err(KernelError::NoSuchProcess(ppid))
        // }

        // no hanging
        match self.table.get(&pid) {
            Some(child) => {
                if child.ppid != ppid {
                    // the child is not the child?
                    Err(KernelError::NotChild{ parent : ppid, child : pid })
                }
                // loop {
                else if !matches!(child.state, ProcessState::Finished) {
                    Err(KernelError::StillRunning(pid))
                } else {
                    match child.exit_code {
                        Some(exit_code) => {
                            self.table.remove(&pid); // child reaped
                            self.freed_pids.push(Reverse(pid)); // pid freed
                            Ok(exit_code)
                        }
                        None => Err(KernelError::IllegalTransition)
                    }
                }
                // }
            } 
            None => Err(KernelError::NoSuchProcess(pid))
        }
    }

    pub fn ps(& self) -> Vec<&Pcb> {
        let mut processes = Vec::new();
        for (_, pcb) in &self.table {
            processes.push(pcb);
        }
        processes
    }
}
