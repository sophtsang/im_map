use std::fmt;

use crate::process::Pid;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum KernelError {
    // event isn't a legal edge from the process' current state (e.g. Dispatch on a zombie)
    IllegalTransition,
    // no process with this pid in the process table (ESRCH)
    NoSuchProcess(Pid),
    // wait(parent, child) where child's ppid isn't parent (ECHILD)
    NotChild { parent: Pid, child: Pid },
    // wait(pid) on a process that hasn't exited yet; a real wait() would block here
    StillRunning(Pid),
}

impl fmt::Display for KernelError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            KernelError::IllegalTransition => write!(f, "illegal process state transition"),
            KernelError::NoSuchProcess(pid) => write!(f, "({pid}) - no such process"),
            KernelError::NotChild { parent, child } => {
                write!(f, "({child}) - not a child of ({parent})")
            }
            KernelError::StillRunning(pid) => write!(f, "({pid}) - has not exited"),
        }
    }
}

impl std::error::Error for KernelError {}

// lets kernel functions write `-> Result<T>` instead of `-> Result<T, KernelError>`
pub type Result<T> = std::result::Result<T, KernelError>;
