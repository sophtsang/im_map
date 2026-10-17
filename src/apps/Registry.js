// basically simulates the disk where executables are located

import Truck from './truck/Truck';
import GetData from './doppelganger/GetData';

const registry = {
    truck: { name: "truck sim", component: Truck },
    streets: { name: "doppelgangers", component: GetData },
}

export default registry;