from pathlib import Path
import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import json
import requests
import Levenshtein
import numpy as np
from shapely.geometry import Point
from geopy.distance import geodesic
from google.cloud import storage
from google.oauth2 import service_account

app = Flask(__name__)
CORS(app)

colmap_location = None

INPUT_DIRS = ""
API_KEY = os.environ.get("API_KEY")
CLOUD_KEY = json.loads(os.environ.get("GOOGLE_CLOUD_JSON"))
credentials = service_account.Credentials.from_service_account_info(CLOUD_KEY)
client = storage.Client(credentials=credentials, project='im-map')

@app.route('/get_markers', methods=["POST"])
def get_data():
    global colmap_location
    location = request.get_json().get("path").replace(" ", "_")
    data_dic = {}

    with open(f"/home/xtsang/im_map/src/geocoded_dataset.json", "r") as f:
        location_data = json.load(f).get(f"{location}\n")

    if location_data is None:
        location.replace("_", " ")
        url = (
            f"https://maps.googleapis.com/maps/api/place/autocomplete/json"
            f"?input={location}&key={API_KEY}"
        )

        predictions = requests.get(url).json().get("predictions")
        user_ratings = [requests.get(f"https://places.googleapis.com/v1/places/{place_id}?fields=userRatingCount&key={API_KEY}").json().get("userRatingCount") 
                        for place_id in [places.get("place_id") for places in predictions]]
        results = [Levenshtein.distance(location, (places.get("structured_formatting").get("main_text"))) for places in predictions]

        if np.any(np.array(user_ratings)):
            index = np.argmax([(rating if rating != None else -1) for rating in np.array(user_ratings)])
        elif np.any(np.array(results)):
            index = np.argmin(np.array(results))
        else:
            return jsonify({"doppelgangers_data": ""})

        place_id = [places.get("place_id") for places in predictions][index]
        location = [places.get("structured_formatting").get("main_text") for places in predictions][index]

        with open(f"/home/xtsang/im_map/src/geocoded_dataset.json", "r") as f:
            location_data = json.load(f).get(f"{location.replace(" ", "_")}\n")

    if location_data:
        coordinates = [float(coord) for coord in location_data.get('latlng').split(", ")]
        location_data = {
                            "address" : location_data.get('address').replace("\n", ""),
                            "lat" : coordinates[0],
                            "lng" : coordinates[1]
                        }
    else:
        url = (
                f"https://geocode.googleapis.com/v4beta/geocode/places/{place_id}?key={API_KEY}"
            )

        results = requests.get(url).json()
        location_data = {
                            "address" : location,
                            "lat" : float(results.get("location").get("latitude")),
                            "lng" : float(results.get("location").get("longitude"))
        }
        
        return jsonify({"location_data" : location_data,
                    "doppelgangers_data": data_dic}), 200

    if not location:
        return jsonify({"error": "Directory path ('path' field) is required in the request body."}), 400
    try:
        location = location.replace(" ", "_")
        colmap_location = location
        input_dirs = Path(f"/home/xtsang/im_map/public/doppelgangers/{location}")

        if not input_dirs.exists() or not input_dirs.is_dir():
            data_dic[f"{location_data.get("lat")}_{location_data.get("lng")}"] = { 
                        "lat" : location_data.get("lat"),
                        "lng" : location_data.get("lng"),
                        "images" : ["favicon.ico"]
                    }
            
            return jsonify({"location_data" : location_data,
                    "doppelgangers_data": data_dic}), 200

        
        dir_names = [str(item).replace(f"/home/xtsang/im_map/public/doppelgangers/{location}/", "") for item in list(input_dirs.iterdir())]
        for name in dir_names:
            coords = name.split("_")
            if len(coords) == 2 and coords[1] != "map.png":
                img_dirs = Path(f"/home/xtsang/im_map/public/doppelgangers/{location}/{name}")
                images = [f"/doppelgangers/{location}/{name}/{item}" for item in os.listdir(img_dirs)]
                if len(images) != 0:
                    data_dic[name] = {
                        "lat" : float(coords[0]),
                        "lng" : float(coords[1]),
                        "images" : [f"/doppelgangers/{location}/{name}/{item}" for item in os.listdir(img_dirs)]
                    }
        
        return jsonify({"location_data" : location_data,
                        "doppelgangers_data" : data_dic}), 200
    
    except:
        return jsonify({"doppelgangers_data" : ""})

@app.route('/get_distance', methods=["POST"])
def get_distance():
    loc1, loc2 = request.get_json().get("distancePoints")
    distance = geodesic((loc1.get("lat"), loc1.get("lng")), (loc2.get("lat"), loc2.get("lng")))
    return jsonify({"distance" : distance.meters})

@app.route('/autocomplete', methods=["POST"])
def autocomplete():
    print("AUTOCOMPLETING")
    bucket = client.get_bucket('doppelgangers')
    blobs = bucket.list_blobs()
    current_input = request.get_json().get("path").replace("_", " ")
    print(current_input)

    if len(current_input) > 0:
        possible_locations = np.array(list(set([blob.name.split("/")[0].replace("_", " ") for blob in blobs])))
        print(possible_locations)
        mask = np.array([locations[:len(current_input)].lower() == current_input.lower() for locations in possible_locations])
        suggestions = [locs[len(current_input):] for locs in possible_locations[mask][:3]]
        return jsonify({"suggestions" : suggestions if len(suggestions) > 0 else [""], 
                        "curr" : [locs[:len(current_input)] for locs in possible_locations[mask][:3]],
                        "index" : 0})
    else:
        return jsonify({"suggestions" : [""], "curr" : [""], "index" : 0})
    
@app.route('/colmap_reconstruction', methods=['POST'])
def get_colmap_reconstruction():
    print("CONSTRUCTING")
    global colmap_location
    colmap_location = request.get_json().get("location")

    try:
        bucket = client.get_bucket('public_matches')
        blob = json.loads(bucket.blob(f"{colmap_location.replace(" ", "_")}/sparse/colmap_model.json").download_as_string())
        return jsonify(blob)
        # return send_file(f"/home/xtsang/im_map/public/matches/{colmap_location.replace(" ", "_")}/sparse/colmap_model.json")
    except:
        return jsonify(None)

@app.route('/check_location', methods=['POST'])
def check_location():
    global colmap_location
    colmap_location = request.get_json().get("location")

    bucket = client.get_bucket('public_matches')
    blob = bucket.blob(f"{colmap_location.replace(" ", "_")}/sparse/fused.ply")
    print(blob.exists(client))
    return jsonify({"exists": blob.exists(client), "ply": blob})
    # return jsonify({"exists": os.path.exists(f"/home/xtsang/im_map/public/doppelgangers/{colmap_location.replace(" ", "_")}/dense/fused.ply")}) 

if __name__ == "__main__":
    # app.run(debug=True, host="127.0.0.1", port=5000)
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)