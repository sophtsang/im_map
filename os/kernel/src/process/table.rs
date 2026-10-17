// Process Table containing all active processes
// when process becomes zombie and parent calls wait(pid), reads exit_code -> delete
// from table (hashmap)
use std::collections::BinaryHeap;
use std::cmp::Reverse;
use std::collections::BTreeMap; // want sorted pids

use super::{Pcb, Pid};

pub struct ProcessTable {
    table : BTreeMap<Pid, Pcb>,
    freed_pids : BinaryHeap<Reverse<Pid>>,
    next_unused : Pid
} 

impl ProcessTable {
    fn new() -> Self {
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

    fn spawn(&mut self, ppid : Pid, entry : String) {
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
    }

    fn ps() {
        todo!("eventually print out process tree: PID, CMD")
    }
}
