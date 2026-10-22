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

    fn contains(&self, fpid: Pid) -> bool {
        match self {
            DwindleNode::Empty => return false,
            DwindleNode::Leaf(pid) => return *pid == fpid,
            DwindleNode::Split{first, second, ..} => {
                return first.contains(fpid) || second.contains(fpid)
            }
        }
    }

    fn resize(&mut self, a: Pid, b: Pid, cx: f32, cy: f32, window: Rectangle) -> bool {
        let DwindleNode::Split { first, second, dir, ratio } = self else {
            // we directly look at the children of the split nodes
            return false;
        };
        let r = *ratio;
        let rectangles = match dir {
            Direction::Horizontal => {
                // first is left, (x, y) is top left corner
                vec![Rectangle{
                    x: window.x, y: window.y,
                    w: window.w * r, h: window.h
                }, Rectangle{
                    x: window.x + window.w * r, y: window.y,
                    w: window.w * (1.0 - r), h: window.h
                }]
            }
            Direction::Vertical => {
                // first is top
                vec![Rectangle{
                    x: window.x, y: window.y,
                    w: window.w, h: window.h * r
                }, Rectangle{
                    x: window.x, y: window.y + window.h * r,
                    w: window.w, h: window.h * (1.0 - r)
                }]
            }
        };
        let a_in_first = first.contains(a);
        let b_in_first = first.contains(b);
        // unless we have found the split, either a and b both in first, or neither
        if a_in_first && b_in_first {
            return first.resize(a, b, cx, cy, rectangles[0])
        } 
        else if !a_in_first && !b_in_first {
            return second.resize(a, b, cx, cy, rectangles[1])
        } 
        else {
            // we are at the split
            *ratio = (match dir {
                Direction::Vertical => (cy - window.y) / window.h,
                Direction::Horizontal => (cx - window.x) / window.w
            }).clamp(0.1, 0.9);
            return true
        }
    }

    // search for node to remove w/ pid
    // returns true if rpid was found and removed somewhere in this subtree
    fn remove(&mut self, rpid: Pid) -> bool {
        let DwindleNode::Split { first, second, .. } = self else {
            // we directly look at the children of the split nodes
            return false;
        };
        // first: Box(DwindleNode) -> *first = DwindleNode -> **first = pid if Leaf
        if let DwindleNode::Leaf(pid) = **first && pid == rpid {
            // first is removed, second replaces the split node
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
        if self.root.contains(npid) {
            return Err(WindowError::DuplicateProcess(npid));
        }
        
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

    pub fn resize(&mut self, apid: Pid, bpid: Pid, cx: f32, cy: f32, window: Rectangle) -> Result<(), WindowError> {
        // dragging a border between two windows is equivalent to dragging 
        // the Split node
        // ratio = (cursor.y - rect.y) / rect.h
        // these checks also cover the empty tree and a lone window: neither can
        // contain two different pids, so the walk below always finds a split
        if apid == bpid { return Err(WindowError::SameWindow(apid)) }
        if !self.root.contains(apid) { return Err(WindowError::NoSuchWindow(apid)) }
        if !self.root.contains(bpid) { return Err(WindowError::NoSuchWindow(bpid)) }
        match self.root.resize(apid, bpid, cx, cy, window) {
            true => Ok(()),
            false => Err(WindowError::NoSuchWindow(apid))
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