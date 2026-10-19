// the idea is to be able to have multiple different layouts,
// all following same interface like ish

// instead of having to traverse through the entire tree,
// better to have pid pointers to their nodes?
use crate::error::WindowError;
use crate::Pid;

enum DwindleNode {
    // a window w/ pid, if split, creates child
    Leaf(Pid), 
    Split{ ratio: f32, first: Box<DwindleNode>, second: Box<DwindleNode> } // split ratio, horizontal + or vertical -
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
    fn split(&mut self, fpid : Pid, npid : Pid, ratio : f32) -> bool {
        // kernel will give the fpid that the node is focused on -> split
        // at the current node
        // also from spawn we know the pid of the new window: npid
        match self {
            DwindleNode::Leaf(pid) => { // curr pid
                if fpid == *pid {
                    // split
                    *self = DwindleNode::Split{
                        ratio: ratio * -1.0, 
                        first: Box::new(DwindleNode::Leaf(fpid)), 
                        second: Box::new(DwindleNode::Leaf(npid))
                    };
                    return true;
                }
                return false;
            }
            DwindleNode::Split{ratio, first, second} => {
                let mut found = first.split(fpid, npid, *ratio);
                if !found {
                    found = second.split(fpid, npid, *ratio);
                }
                return found;
            }
        }
    }

    // search for node to remove w/ pid
    fn remove(&mut self, rpid : Pid) -> bool {
        match self {
            DwindleNode::Leaf(pid) => { // curr pid
                if rpid == *pid {
                    // split
                    return true;
                }
                return false;
            }
            DwindleNode::Split{ratio, first, second} => {
                // removing a leaf, and making the other leaf the new parent
                if first.remove(rpid) {
                    *self = std::mem::replace(second.as_mut(), DwindleNode::Leaf(0));
                } else if second.remove(rpid) {
                    *self = first;
                } 
                return false; // remove first instance of true
            }
        }

    }
}

impl DwindleTree {
    pub fn new(pid : Pid) -> Self {
        Self { root : DwindleNode::new(pid) }
    }

    pub fn insert(&mut self, fpid: Option<Pid>, npid: Pid) -> Result<(), WindowError> {
        if let Some(pid) = fpid {
            match self.root.split(pid, npid, 0.5) {
                true => Ok(()),
                false => Err(WindowError::NoSuchWindow(pid))
            }
        } else {
            // no focused window: the new window takes half of the whole screen
            let old_root = std::mem::replace(&mut self.root, DwindleNode::Leaf(npid));
            self.root = DwindleNode::Split{
                ratio: 0.5,
                first: Box::new(old_root),
                second: Box::new(DwindleNode::Leaf(npid))
            };
            Ok(())
        }
    }

    pub fn remove(&mut self, pid : Pid) {
        // removing a leaf, and making the other leaf the new parent
        self.root.remove(pid);
    }
}