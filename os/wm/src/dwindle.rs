// the idea is to be able to have multiple different layouts,
// all following same interface like ish

// instead of having to traverse through the entire tree,
// better to have pid pointers to their nodes?
use crate::error::WindowError;
use crate::Pid;

// which way a split divides its space
//   Horizontal: first | second  (side by side, divider is a vertical line)
//   Vertical:   first / second  (stacked, divider is a horizontal line)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Direction { Horizontal, Vertical }

impl Direction {
    // dwindle alternates direction at each level of the tree
    fn flip(self) -> Self {
        match self {
            Direction::Horizontal => Direction::Vertical,
            Direction::Vertical => Direction::Horizontal,
        }
    }
}

enum DwindleNode {
    // a window w/ pid, if split, creates child
    Empty,
    Leaf(Pid), 
    Split{ 
        ratio: f32, dir: Direction, // ratio = share of the space given to first
        first: Box<DwindleNode>, second: Box<DwindleNode>
    }
}

pub struct DwindleTree {
    // a binary tree map from pid -> node
    root : DwindleNode
}

impl DwindleNode {
    fn new(pid : Pid) -> Self {
        DwindleNode::Leaf(pid)
    }

    // helper for DwindleTree::split, at subtree pid
    // pdir is the direction of the split this node sits inside of
    fn split(&mut self, fpid : Pid, npid : Pid, pdir : Direction) -> bool {
        // kernel will give the fpid that the node is focused on -> split
        // at the current node
        // also from spawn we know the pid of the new window: npid
        match self {
            DwindleNode::Empty => { // empty node, so directly create a new leaf to split
                return false;
            }
            DwindleNode::Leaf(pid) => { // curr pid
                if fpid == *pid {
                    // split
                    *self = DwindleNode::Split{
                        ratio: 0.5, dir: pdir.flip(),
                        first: Box::new(DwindleNode::Leaf(fpid)), 
                        second: Box::new(DwindleNode::Leaf(npid))
                    };
                    return true;
                }
                return false;
            }
            DwindleNode::Split{dir, first, second, ..} => {
                first.split(fpid, npid, *dir) || second.split(fpid, npid, *dir)
            }
        }
    }

    // search for node to remove w/ pid
    // returns true if rpid was found and removed somewhere in this subtree
    fn remove(&mut self, rpid: Pid) -> bool {
        let DwindleNode::Split { first, second, .. } = self else {
            return false;
        };
        if let DwindleNode::Leaf(pid) = **first && pid == rpid {
            *self = std::mem::replace(second.as_mut(), DwindleNode::Leaf(0));
            return true;
        }
        if let DwindleNode::Leaf(pid) = **second && pid == rpid {
            *self = std::mem::replace(first.as_mut(), DwindleNode::Leaf(0));
            return true;
        }
        first.remove(rpid) || second.remove(rpid)
    }
}

impl DwindleTree {
    pub fn new() -> Self {
        Self { root : DwindleNode::Empty }
    }

    pub fn insert(&mut self, fpid: Option<Pid>, npid: Pid) -> Result<(), WindowError> {
        if matches!(self.root, DwindleNode::Empty) {
            self.root = DwindleNode::new(npid); // new window, should take up entire screen
            return Ok(());
        } 
        if let Some(pid) = fpid {
            // root acts as if its parent were Vertical, so the first split is Horizontal
            match self.root.split(pid, npid, Direction::Vertical) {
                true => Ok(()),
                false => Err(WindowError::NoSuchWindow(pid))
            }
        } else {
            // no focused window: the new window takes half of the whole screen
            let old_root = std::mem::replace(&mut self.root, DwindleNode::Leaf(npid));
            self.root = DwindleNode::Split{
                ratio: 0.5, dir: Direction::Horizontal,
                first: Box::new(old_root),
                second: Box::new(DwindleNode::Leaf(npid))
            };
            Ok(())
        }
    }

    pub fn remove(&mut self, pid : Pid) -> Result<(), WindowError> {
        // removing a leaf, and making the other leaf the new parent
        if matches!(self.root, DwindleNode::Empty) {
            return Err(WindowError::NoSuchWindow(pid));
        }
        if let DwindleNode::Leaf(id) = self.root {
            if id == pid {
                self.root = DwindleNode::Empty;
                return Ok(())
            } else {
                return Err(WindowError::NoSuchWindow(pid));
            }
        }
        match self.root.remove(pid) {
            true => Ok(()),
            false => Err(WindowError::NoSuchWindow(pid))
        }
    }
}