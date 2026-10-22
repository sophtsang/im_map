// basically simulates the disk where executables are located

import Truck from './truck/Truck';
import GetData from './doppelganger/GetData';
import Terminal from './terminal/Terminal';
import Resume from './resume/Resume';

const registry = {
    truck: { name: "truck sim", component: Truck, mode: "floating" },
    streets: { name: "doppelgangers", component: GetData, mode: "floating" },
    terminal: { name: "terminal", component: Terminal, mode: "tiled" },
    resume: { name: "resume", component: Resume, mode: "tiled" }
}

export default registry;