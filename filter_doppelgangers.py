# from google import genai
import PIL.Image
from pathlib import Path
import os
import requests
import shutil
import json
import numpy as np
import sys
import csv
from scipy import stats
import math

import sqlite3
import struct

# after recieving colmap matches, filter out doppelgangers
# API_KEY = "AIzaSyBICFXaGyaBF4WlPyQi0vNjvaUdO0zCvS8"
API_KEY = "AIzaSyCCzZnFLeZAvAPOLQKz9RZy6gZ6R-7l5Tg"
# client = genai.Client(api_key=f"{API_KEY}")

# the direction the camera is looking
geo_direction = {0: "north",
                 1: "northeast",
                 2: "east",
                 3: "southeast",
                 4: "south",
                 5: "southwest",
                 6: "west",
                 7: "northwest"}

def angle_to_direction(angles, weights):
    x = sum(math.cos(math.radians(a)) * w for a, w in zip(angles, weights))
    y = sum(math.sin(math.radians(a)) * w for a, w in zip(angles, weights))
    avg_rad = math.atan2(y, x)
    avg_deg = math.degrees(avg_rad)
    angle = avg_deg % 360

    index = int(((360 - angle) + 22.5) // 45) % 8

    return { 
             "raw_angle": angle,
             "camera_location": geo_direction[(index + 4) % 8],
             "camera_viewing_direction": geo_direction[index] }

angles = [243] 

weights =  [1]

location = sys.argv[1]
images =  Path(f"public/doppelgangers/{location}")

db_path = f"matches/{location}/database.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT image_id, name FROM images")
image_rows = cursor.fetchall()
image_map = {row[1]: row[0] for row in image_rows} 

cursor.execute("SELECT image_id, position_covariance FROM pose_priors")
pose_priors = {row[0]: row[1] for row in cursor.fetchall()} 

geo_direction = {0: "north",
                 1: "northeast",
                 2: "east",
                 3: "southeast",
                 4: "south",
                 5: "southwest",
                 6: "west",
                 7: "northwest"}


def get_gps_prior():
    with open(f"matches/{location}/filtered_matches.json", "r") as f:
        filtered_matches = json.load(f)
        for img, matches in filtered_matches.items():
            priors = []
            angle = matches.get("cameras").get("raw_angle")
            print(img)
            for streetview in matches.get("matched_images"):
                for dirs in images.iterdir():
                    if not dirs.is_file():
                        for file in dirs.iterdir():
                            if "map" not in file.name and file.name == streetview.replace("[STREETVIEWPANORAMA]_", ""):
                                priors = priors + [np.array(dirs.name.split("_")).astype(float)]
            if len(priors) > 0:
                x, y = np.mean(priors, axis = 0)
                db_image_id = image_map.get(img)
                position = struct.pack('3d', x, y, float('nan'))
                if db_image_id in pose_priors:
                    cursor.execute("""
                        UPDATE pose_priors
                        SET position = ?, position_covariance = NULL
                        WHERE image_id = ?
                    """, (position, db_image_id))
                else:
                    cursor.execute("""
                        INSERT INTO pose_priors (image_id, position, coordinate_system, position_covariance)
                        VALUES (?, ?, ?, ?)  
                    """, (db_image_id, position, 0, None))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    get_gps_prior()