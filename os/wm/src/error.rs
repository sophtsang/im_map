use std::fmt;

use crate::Pid;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WindowError {
    // no window with this pid in the layout
    NoSuchWindow(Pid),
    DuplicateProcess(Pid),
    // resize needs two different windows on either side of a border
    SameWindow(Pid)
}

impl fmt::Display for WindowError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WindowError::NoSuchWindow(pid) => write!(f, "({pid}) - no such window"),
            WindowError::DuplicateProcess(pid) => write!(f, "({pid}) - process already exists"),
            WindowError::SameWindow(pid) => write!(f, "({pid}) - can't resize a window against itself")
        }
    }
}

impl std::error::Error for WindowError {}

// lets wm functions write `-> Result<T>` instead of `-> Result<T, WindowError>`
pub type Result<T> = std::result::Result<T, WindowError>;
