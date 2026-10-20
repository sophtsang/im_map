pub mod error;
pub mod dwindle;

pub type Pid = u32;

pub use error::WindowError;

#[cfg(test)]
mod tests;