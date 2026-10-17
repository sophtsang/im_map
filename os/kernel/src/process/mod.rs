use crate::error::KernelError;

pub mod table;
pub type Pid = u32;

pub enum ProcessEvent {
    Yield,
    Dispatch,
    Block,
    BlockDone,
    Exit(i32), //exit_code
    Kill
}

pub enum ProcessState {
    Runnable,
    Waiting,
    Running,
    Finished
}
// simulates on process + its PCB
pub struct Pcb {
    pid : Pid, // imagine process table is a hashmap, and pid is the key, value is exectuable
    ppid : Pid, // pid of parent process, forms a connected componentish union find tree
    state : ProcessState,
    entry : String, // represents location of executable on disk, where in the registry, JS component-wise
    exit_code : Option<i32>,
    // cmd : String // the command that spawned this process
}

impl Pcb {
    // a new process has been spawned, init the PCB, which basiaclly represents the process
    fn new(pid : Pid, ppid : Pid, entry : String) -> Self {
        // add to RunQueue
        Self { 
            pid : pid,
            ppid : ppid,
            state : ProcessState::Runnable,
            entry : entry,
            exit_code: None
        }
    }

    fn transition(&mut self, event : ProcessEvent) -> Result<(), KernelError> {
        // pcb state transition
        self.state = match (&self.state, event) {
            (ProcessState::Runnable, ProcessEvent::Dispatch) => ProcessState::Running, // do Running related stuff
            (ProcessState::Running,  ProcessEvent::Yield) => ProcessState::Runnable,
            (ProcessState::Running,  ProcessEvent::Block) => ProcessState::Waiting,
            (ProcessState::Waiting,  ProcessEvent::BlockDone) => ProcessState::Runnable,
            (ProcessState::Running,  ProcessEvent::Exit(exit_code)) => { 
                self.exit_code = Some(exit_code);
                ProcessState::Finished
            },
            (ProcessState::Finished, ProcessEvent::Kill) => return Err(KernelError::IllegalTransition),
            (_, ProcessEvent::Kill) => {
                self.exit_code = Some(-9); // for killed
                ProcessState::Finished
            }
            _ => return Err(KernelError::IllegalTransition)
        };
        Ok(())
    }

}

