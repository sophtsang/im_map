// basically simulates the disk where executables are located

import Truck from './truck/Truck';
import GetData from './doppelganger/GetData';
import Terminal from './terminal/Terminal';

const registry = {
    truck: { name: "truck sim", component: Truck, mode: "floating" },
    streets: { name: "doppelgangers", component: GetData, mode: "floating" },
    terminal: { name: "terminal", component: Terminal, mode: "tiled" }
}

export default registry;