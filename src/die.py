import requests
import numpy as np
import Levenshtein

API_KEY = "AIzaSyAhKtmL9NcWLfryjOzZ7HOVVxxNcQF_ZEI"

location = "westminster abbey"
url = (
    f"https://maps.googleapis.com/maps/api/place/autocomplete/json"
    f"?input={location}&key={API_KEY}"
)

predictions = requests.get(url).json().get("predictions")

user_ratings = [requests.get(f"https://places.googleapis.com/v1/places/{place_id}?fields=userRatingCount&key={API_KEY}").json().get("userRatingCount") 
                for place_id in [places.get("place_id") for places in predictions]]


if np.any(np.array(user_ratings)):
    index = np.argmax([(rating if rating != None else -1) for rating in np.array(user_ratings)])

else:
    results = [Levenshtein.distance(location, (places.get("structured_formatting").get("main_text"))) for places in predictions]
    index = np.argmin(np.array(results))

place_id = [places.get("place_id") for places in predictions][index]

address = [places.get("structured_formatting").get("main_text") for places in predictions][index]

url = (
        f"https://geocode.googleapis.com/v4beta/geocode/places/{place_id}?key={API_KEY}"
    )

results = requests.get(url).json()
location_data = {
                    "address" : address,
                    "lat" : float(results.get("location").get("latitude")),
}

print(location_data)