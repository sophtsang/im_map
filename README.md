# i'm map?

Visualizer for the Google Maps Street View panorama dataset curated for [MegaScenes](https://megascenes.github.io/) text annotation evaluation. 

## Notes to self:
To run [colmap gui]: LIBGL_ALWAYS_SOFTWARE=1 colmap gui

On G2: 
colmap feature_extractor \
--database_path database.db
--image_path StreetView/doppelgangers/<location>
--SiftExtractor.use_gpu 0

colmap exhaustive_matching \
--database_path database.db

On im_map:
scp from database.db from G2 to im_map

colmap mapper \
--database_path database.db
--image_path <image directory>
--output_path sparse

colmap gui 

optional:
colmap model_converter \
--input_path sparse/0 \
--output_path sparse/0 \
--output_type TXT
