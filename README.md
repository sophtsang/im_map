# i'm map?

Visualizer for the Google Maps Street View panorama dataset curated for [MegaScenes](https://megascenes.github.io/) text annotation evaluation. 

## Notes to self, turn this into a SLURM script:
To run [colmap gui]: LIBGL_ALWAYS_SOFTWARE=1 colmap gui

# On G2: 
Prepare the <location> matching dataset:
```
python prepare_colmap.py <location>
```

This is what the directory should look like for <location>: 

```
xt73/doppelgangers-plusplus/
├── matches/
│   ├── st_wiki_combined/<location>  
│   ├── streetview/<location>           
│   └── wikimedia/<location>               
└── colmap_workspace/         
    └── <location>/
        ├── database.db 
        ├── sparse/          
        └── matches.csv 
```
Then run:
```
colmap feature_extractor \
--database_path database.db
--image_path StreetView/doppelgangers/<location>
--SiftExtraction.use_gpu 0

colmap exhaustive_matcher \
--database_path database.db
```

# On im_map:
scp from database.db from G2 to im_map

```
colmap mapper \
--database_path database.db
--image_path <image directory>
--output_path sparse

LIBGL_ALWAYS_SOFTWARE=1 colmap gui
```

# Optional:
```
colmap model_converter \
--input_path sparse/0 \
--output_path sparse/0 \
--output_type TXT
```