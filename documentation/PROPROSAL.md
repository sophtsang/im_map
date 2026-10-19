# **i'm** a virtual **map**book
The layers, from high-level to low-level:
## _eins:_ Physical Computer
A Three.js scene with a modeled monitor that renders the desktop as an ```iframe```.

**Future Graphics Projects:**
1) CRT shaders.
2) Moebius art style shaders.

This is mostly frontend and is done in Javascript, React.js and Three.js.

## _zwei:__ Desktop Environment
I guess the frontend display of the desktop environment will still be in Javascript, I believe this code already exists in ```im_map```.
Compile Rust to WebAssembly with ```wasm-bindgen``` or ```wasm-pack``` to have it run static on GitHub Pages.

The Rust kernel manages state, JavaScript runs the apps (is this how it works in actual OS)?

**Contents:**
1) What the user sees is a desktop with draggable windows, a file system (optional, or a later task), a minishell (I want this to work like the taskbar, where it can start applications, modify file system information, ..., more on this in Minishell section), and process controls.
2) The installable application are displayed as draggable windows, and will mainly be the way I represent my project pages, visualizations, and demos in this portfolio.

```wasm-pack``` is a tool that allows for building JS packages in Rust. This also enables the use of Rust in an existing JavaScript frontend.

For program simulation, not going to convert ```.js``` files to binary executables and then processes. Where the loader should map code executable into memory, we will have JS look up ```entry``` in a registry to mount corresponding component in a window. Kernel will read the manifest, create a PCB and return a pid.

### Wayland Window Manager
The way an OS draws windows on the screen depends on display protocol. Wayland is a communication protocol that has applications talking directly to the compositor, which owns rendering pipeline and input handling. 

**Dynamic tiling**: places new windows autonomatically based on a layout algorithm. We will having```Hyprland's Dwindle``` tiling logic decide where a new window goes and what shape it takes. 
Dwindle follows a BSPWN (Binary Space Partitioning Window Manager)-like binary tree layout, where every window on a workspace is part of a hierarchical split tree. Each new window splits the current container either horizontally or vertically.
We will implement a BSP (binary space partioning) tree for tiling.

**```wmReducer```**: we will have ```action``` be a JS object that describes something that happened in the window manager, i.e. a window was opened with ```pid```, ```entry```, etc. as a result of user event.
When the kernel creates a process, something dispatches ```OPEN```. ```useReducer(wmReducer, initialWM)``` gives the current ```state``` and ```dispatch``` function. Whatever ```wmReducer(currentState, action)``` returns will be the new ```curentState```.

For ```OPEN```, ```wmReducer``` returns a copy of ```currentState```, with new ```window``` being appended to the map of all existing ```windows```, new ```focused``` process being that of the newly spawned ```action.pid```, and next z-index being incremented by one.

## _drei:_ Simulated OS Kernel
This is the backend project I want to start working on, now that the frontend desktop environment and 3D computer shell already exists in ```im_map``` and ```sophtsang.github.io```, respectively.
**Contents:**
1) The first steps (prior to sophisticating everything) is to build a small process manager and scheduler that models concepts found in a real OS, like Linux.
2) Should have a simple process manager, scheduler, memory accounting, IPC, and virtual filesystem. Order this in terms of priority, would it be feasible to get a minishell working that acts as an application launcher first?
3) Every app instance is a process and should have a process control block or equivalent data struction containing its execution state and metadata.
4) _Scheduling algorithm_: for now, lets just have FIFO. Eventually, might be interesting to have more sophisticated priority scheduling and context switching. Or [preemptive scheduler](https://www.cs.cornell.edu/courses/cs4410/2011fa/CS4411/projects/project2/project2.pdf).
5) _Virtual filesystem_: doesn't have to be anything too complex right now, something like an ```applications/``` directory that contains ```projects/, terminal/, task_manager/```? Whatever is IndexedDB could help.
6) _IPC_: applications interact through OS-like APIs rather than reaching into each other's internal state. Focus on this later? Have like a task manager that displays all currently running processes.

**Process control block (PCB)**: for each process, the OS has a PCB containing:
1) Location in memory (page table)
2) Location of executable (the manifest) on disk (registry): entry-executable mapping stored in [Registry.js](/src/apps/Registry.js)
3) Which user is executing this process (uid)
4) Process identifier (pid), will be returned
5) Process status (running, waiting, finished, etc.)
6) Scheduling information
7) Kernel stack
8) Saved user SP
9) Saved kernel SP

**Process lifecycle**: model this as an FSM
1) Init: initialize the PCB
2) Runnable: process' PCB enqueued to RunQueue
    - If dispatch: goto Running
    - If blocking call (read, wait): goto Waiting
3) Waiting: process' PCB on WaitingQueue
    - If blocking call done: goto Runnable
4) Running: PCB dequeued from RunQueue, currently running
    - If yield: goto Runnable
    - If done (exit): goto Finished
5) Finished: PCB on FinishedQueue, process = zombie, ultimately deleted when dequeued

### Organization of OS Kernel Implementation
All active processes are on the [Process Table](/os/kernel/src/process/table.rs). The "compile" order in which the kernel is implemented in Rust and made available in JS is as follows:
1) [os/kernel/src/process/](/os/kernel/src/process/) contains implementation of individal process, represented by PCB in [mod.rs](/os/kernel/src/process/mod.rs) and process table in [table.rs](/os/kernel/src/process/table.rs), which operates on all active processes
2) ```wasm``` converts Rust implementation to JS in [lib.rs](os/kernel-wasm/src/lib.rs)
3) [kernel.js](/src/kernel.js) contains the JS version of the Rust OS kernel, where ```kernel = new Kernel()``` represents the process table managing all active processes in the virtual desktop environment. ```kernel``` can be accessed via import from ```./kernel```, and is initialized when the entire environment was initially booted
    - To reiterate, ```kernel``` in [App.js](/src/App.js) is an instance of [table.rs](/os/kernel/src/process/table.rs)'s ```ProcessTable``` struct
    - _Note:_ Booting and render order is defined in [index.js](/src/index.js)

## _vier:_ Application Runtime
Determines how the apps are actually executed: handles app lifecycle, event delivery, app isolation, game loops, and rendering.

Simulate preemption, the Rust kernel cannot interrupt JS, but it can stop scheduling an app that went over its time budget. Rust decides app lifecycles.

## _funf:_ Host Platform
Everything is hosted in the browser via Git Pages, I think.


