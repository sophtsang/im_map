use crate::dwindle::{DwindleTree, Rectangle};
use crate::{Pid, WindowError};

const SCREEN: Rectangle = Rectangle { x: 0.0, y: 0.0, w: 100.0, h: 100.0 };

// finds the rectangle laid out for pid, panics if pid has none
fn rect_of(layout: &[(Pid, Rectangle)], pid: Pid) -> Rectangle {
    layout.iter()
        .find(|(p, _)| *p == pid)
        .map(|(_, r)| *r)
        .unwrap_or_else(|| panic!("pid {pid} missing from layout"))
}

// f32 math (e.g. 100 * 0.7) isn't exact, so compare within a small epsilon
fn assert_rect(actual: Rectangle, x: f32, y: f32, w: f32, h: f32) {
    let close = |a: f32, b: f32| (a - b).abs() < 1e-3;
    assert!(
        close(actual.x, x) && close(actual.y, y) && close(actual.w, w) && close(actual.h, h),
        "expected ({x}, {y}, {w}, {h}), got {actual:?}"
    );
}

// 1 | 2 on top, 3 below 2:  1 (0,0,50,100), 2 (50,0,50,50), 3 (50,50,50,50)
fn three_windows() -> DwindleTree {
    let mut tree = DwindleTree::new();
    tree.insert(None, 1, None).unwrap();
    tree.insert(Some(1), 2, None).unwrap();
    tree.insert(Some(2), 3, None).unwrap();
    tree
}

// ---- insert ----

#[test]
fn empty_tree_has_no_windows() {
    let tree = DwindleTree::new();
    assert!(tree.layout(SCREEN).is_empty());
}

#[test]
fn first_window_fills_screen() {
    let mut tree = DwindleTree::new();
    tree.insert(None, 1, None).unwrap();
    let layout = tree.layout(SCREEN);
    assert_eq!(layout.len(), 1);
    assert_rect(rect_of(&layout, 1), 0.0, 0.0, 100.0, 100.0);
}

#[test]
fn first_window_ignores_focus_when_empty() {
    // nothing to split yet, so a stale focused pid shouldn't matter
    let mut tree = DwindleTree::new();
    tree.insert(Some(42), 1, None).unwrap();
    assert_rect(rect_of(&tree.layout(SCREEN), 1), 0.0, 0.0, 100.0, 100.0);
}

#[test]
fn second_window_splits_side_by_side() {
    let mut tree = DwindleTree::new();
    tree.insert(None, 1, None).unwrap();
    tree.insert(Some(1), 2, None).unwrap();
    let layout = tree.layout(SCREEN);
    assert_rect(rect_of(&layout, 1), 0.0, 0.0, 50.0, 100.0);
    assert_rect(rect_of(&layout, 2), 50.0, 0.0, 50.0, 100.0);
}

#[test]
fn third_window_splits_focused_vertically() {
    let layout = three_windows().layout(SCREEN);
    assert_rect(rect_of(&layout, 1), 0.0, 0.0, 50.0, 100.0);
    assert_rect(rect_of(&layout, 2), 50.0, 0.0, 50.0, 50.0);
    assert_rect(rect_of(&layout, 3), 50.0, 50.0, 50.0, 50.0);
}

#[test]
fn fourth_window_continues_spiral() {
    let mut tree = three_windows();
    tree.insert(Some(3), 4, None).unwrap();
    let layout = tree.layout(SCREEN);
    assert_rect(rect_of(&layout, 3), 50.0, 50.0, 25.0, 50.0);
    assert_rect(rect_of(&layout, 4), 75.0, 50.0, 25.0, 50.0);
}

#[test]
fn custom_ratio_horizontal() {
    let mut tree = DwindleTree::new();
    tree.insert(None, 1, None).unwrap();
    tree.insert(Some(1), 2, Some(0.7)).unwrap();
    let layout = tree.layout(SCREEN);
    assert_rect(rect_of(&layout, 1), 0.0, 0.0, 70.0, 100.0);
    assert_rect(rect_of(&layout, 2), 70.0, 0.0, 30.0, 100.0);
}

#[test]
fn custom_ratio_vertical() {
    let mut tree = DwindleTree::new();
    tree.insert(None, 1, None).unwrap();
    tree.insert(Some(1), 2, None).unwrap();
    tree.insert(Some(2), 3, Some(0.7)).unwrap();
    let layout = tree.layout(SCREEN);
    assert_rect(rect_of(&layout, 2), 50.0, 0.0, 50.0, 70.0);
    assert_rect(rect_of(&layout, 3), 50.0, 70.0, 50.0, 30.0);
}

#[test]
fn insert_without_focus_splits_whole_screen() {
    let mut tree = three_windows();
    tree.insert(None, 4, None).unwrap();
    let layout = tree.layout(SCREEN);
    // old tree squeezed into the left half, new window gets the right half
    assert_rect(rect_of(&layout, 1), 0.0, 0.0, 25.0, 100.0);
    assert_rect(rect_of(&layout, 2), 25.0, 0.0, 25.0, 50.0);
    assert_rect(rect_of(&layout, 3), 25.0, 50.0, 25.0, 50.0);
    assert_rect(rect_of(&layout, 4), 50.0, 0.0, 50.0, 100.0);
}

#[test]
fn insert_next_to_missing_pid_fails() {
    let mut tree = three_windows();
    assert_eq!(tree.insert(Some(99), 4, None), Err(WindowError::NoSuchWindow(99)));
    // tree is unchanged
    assert_eq!(tree.layout(SCREEN).len(), 3);
}

#[test]
fn layout_uses_given_area() {
    // layout is relative to whatever area it's given, not a fixed screen
    let mut tree = DwindleTree::new();
    tree.insert(None, 1, None).unwrap();
    tree.insert(Some(1), 2, None).unwrap();
    let layout = tree.layout(Rectangle::new(10.0, 20.0, 200.0, 80.0));
    assert_rect(rect_of(&layout, 1), 10.0, 20.0, 100.0, 80.0);
    assert_rect(rect_of(&layout, 2), 110.0, 20.0, 100.0, 80.0);
}

// ---- remove ----

#[test]
fn remove_from_empty_fails() {
    let mut tree = DwindleTree::new();
    assert_eq!(tree.remove(1), Err(WindowError::NoSuchWindow(1)));
}

#[test]
fn remove_only_window_empties_tree() {
    let mut tree = DwindleTree::new();
    tree.insert(None, 1, None).unwrap();
    assert_eq!(tree.remove(1), Ok(()));
    assert!(tree.layout(SCREEN).is_empty());
    // and the tree is usable again afterwards
    tree.insert(None, 2, None).unwrap();
    assert_rect(rect_of(&tree.layout(SCREEN), 2), 0.0, 0.0, 100.0, 100.0);
}

#[test]
fn remove_wrong_pid_from_single_window_fails() {
    let mut tree = DwindleTree::new();
    tree.insert(None, 1, None).unwrap();
    assert_eq!(tree.remove(2), Err(WindowError::NoSuchWindow(2)));
    assert_eq!(tree.layout(SCREEN).len(), 1);
}

#[test]
fn remove_missing_pid_fails() {
    let mut tree = three_windows();
    assert_eq!(tree.remove(99), Err(WindowError::NoSuchWindow(99)));
    assert_eq!(tree.layout(SCREEN).len(), 3);
}

#[test]
fn remove_sibling_takes_its_space() {
    let mut tree = three_windows();
    tree.remove(2).unwrap();
    let layout = tree.layout(SCREEN);
    assert_eq!(layout.len(), 2);
    assert_rect(rect_of(&layout, 1), 0.0, 0.0, 50.0, 100.0);
    assert_rect(rect_of(&layout, 3), 50.0, 0.0, 50.0, 100.0);
}

#[test]
fn remove_root_child_promotes_subtree() {
    // removing 1 promotes the 2/3 split to root; it keeps its Vertical direction
    let mut tree = three_windows();
    tree.remove(1).unwrap();
    let layout = tree.layout(SCREEN);
    assert_rect(rect_of(&layout, 2), 0.0, 0.0, 100.0, 50.0);
    assert_rect(rect_of(&layout, 3), 0.0, 50.0, 100.0, 50.0);
}

#[test]
fn remove_deeply_nested_window() {
    let mut tree = three_windows();
    tree.insert(Some(3), 4, None).unwrap();
    tree.remove(3).unwrap();
    let layout = tree.layout(SCREEN);
    assert_eq!(layout.len(), 3);
    assert_rect(rect_of(&layout, 4), 50.0, 50.0, 50.0, 50.0);
}

#[test]
fn remove_twice_fails_second_time() {
    let mut tree = three_windows();
    assert_eq!(tree.remove(2), Ok(()));
    assert_eq!(tree.remove(2), Err(WindowError::NoSuchWindow(2)));
}

#[test]
fn remove_all_then_reinsert() {
    let mut tree = three_windows();
    for pid in [2, 1, 3] {
        tree.remove(pid).unwrap();
    }
    assert!(tree.layout(SCREEN).is_empty());
    tree.insert(None, 5, None).unwrap();
    assert_rect(rect_of(&tree.layout(SCREEN), 5), 0.0, 0.0, 100.0, 100.0);
}

// ---- invariants ----

#[test]
fn tiles_cover_screen_exactly() {
    // any mix of inserts/removes: tile areas always sum to the screen area
    let mut tree = DwindleTree::new();
    tree.insert(None, 1, None).unwrap();
    tree.insert(Some(1), 2, Some(0.3)).unwrap();
    tree.insert(Some(2), 3, None).unwrap();
    tree.insert(Some(1), 4, Some(0.6)).unwrap();
    tree.insert(Some(3), 5, None).unwrap();
    tree.remove(2).unwrap();
    tree.insert(None, 6, Some(0.8)).unwrap();

    let layout = tree.layout(SCREEN);
    assert_eq!(layout.len(), 5);
    let total: f32 = layout.iter().map(|(_, r)| r.w * r.h).sum();
    assert!((total - SCREEN.w * SCREEN.h).abs() < 1e-1, "tiles cover {total}");
    for (pid, r) in &layout {
        assert!(r.x >= 0.0 && r.y >= 0.0, "pid {pid} starts off-screen: {r:?}");
        assert!(r.x + r.w <= 100.0 + 1e-3 && r.y + r.h <= 100.0 + 1e-3, "pid {pid} runs off-screen: {r:?}");
    }
}
