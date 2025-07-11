from pathlib import Path
import numpy as np
import os
import shutil
import sys

location = sys.argv[1]
images =  Path(f"/home/xtsang/im_map/public/doppelgangers/{location}")
os.makedirs(f"/home/xtsang/im_map/matches/{location}", exist_ok=True)

for dirs in images.iterdir():
    if not dirs.is_file():
        for file in [f.name for f in dirs.iterdir() if f.is_file()]:
            if not "map" in file:
                path = f"/home/xtsang/im_map/public/doppelgangers/{location}/{dirs.name}/{file}"
                shutil.copy(path, f"/home/xtsang/im_map/matches/{location}")

