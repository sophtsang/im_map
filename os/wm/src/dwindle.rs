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

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct Rectangle {
    pub x: f32, pub y: f32, 
    pub w: f32, pub h: f32
}

impl Rectangle {
    pub fn new(x: f32, y: f32, w: f32, h: f32) -> Self {
        Self { x: x, y: y, w: w, h: h }
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
    fn split(&mut self, fpid : Pid, npid : Pid, pdir : Direction, ratio : f32) -> bool {
        // kernel will give the fpid that the node is focused on -> split
        // at the current node
        // also from spawn we know the pid of the new window: npid
        match self {
            DwindleNode::Empty => { // empty node
                return false;
            }
            DwindleNode::Leaf(pid) => { // curr pid
                if fpid == *pid {
                    // split
                    *self = DwindleNode::Split{
                        ratio: ratio, dir: pdir.flip(),
                        first: Box::new(DwindleNode::Leaf(fpid)), 
                        second: Box::new(DwindleNode::Leaf(npid))
                    };
                    return true;
                }
                return false;
            }
            DwindleNode::Split{dir, first, second, ..} => {
                first.split(fpid, npid, *dir, ratio) || second.split(fpid, npid, *dir, ratio)
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

    fn layout(&self, window: Rectangle, rectangles: &mut Vec<(Pid, Rectangle)>) {
        match self {
            DwindleNode::Empty => {
                return;
            }
            DwindleNode::Leaf(pid) => {
                // rectangle from ratio and dir
                rectangles.push((*pid, window));
            }
            DwindleNode::Split{ ratio, dir, first, second } => {
                let ratio = *ratio;
                match dir {
                    Direction::Horizontal => {
                        // first is left, (x, y) is top left corner
                        first.layout(Rectangle{
                            x: window.x, y: window.y,
                            w: window.w * ratio, h: window.h
                        }, rectangles);
                        second.layout(Rectangle{
                            x: window.x + window.w * ratio, y: window.y,
                            w: window.w * (1.0 - ratio), h: window.h
                        }, rectangles);
                    }
                    Direction::Vertical => {
                        // first is top
                        first.layout(Rectangle{
                            x: window.x, y: window.y,
                            w: window.w, h: window.h * ratio
                        }, rectangles);
                        second.layout(Rectangle{
                            x: window.x, y: window.y + window.h * ratio,
                            w: window.w, h: window.h * (1.0 - ratio)
                        }, rectangles);
                    }
                }
            }
        }
    }
}

impl DwindleTree {
    pub fn new() -> Self {
        Self { root : DwindleNode::Empty }
    }

    pub fn insert(&mut self, fpid: Option<Pid>, npid: Pid, ratio: Option<f32>) -> Result<(), WindowError> {
        let ratio = ratio.unwrap_or(0.5);
        if matches!(self.root, DwindleNode::Empty) {
            self.root = DwindleNode::new(npid); // new window, should take up entire screen
            return Ok(());
        } 
        if let Some(pid) = fpid {
            // root acts as if its parent were Vertical, so the first split is Horizontal
            match self.root.split(pid, npid, Direction::Vertical, ratio) {
                true => Ok(()),
                false => Err(WindowError::NoSuchWindow(pid))
            }
        } else {
            // no focused window: the new window takes half of the whole screen
            let old_root = std::mem::replace(&mut self.root, DwindleNode::Leaf(npid));
            self.root = DwindleNode::Split{
                ratio: ratio, dir: Direction::Horizontal,
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

    pub fn layout(&self, window : Rectangle) -> Vec<(Pid, Rectangle)> {
        // traverse the tree and return a mapping of pids to rectangles
        let mut rectangles: Vec<(Pid, Rectangle)> = Vec::new();
        self.root.layout(window, &mut rectangles);
        return rectangles;
    }
}