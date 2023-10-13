import boto3
import sys
import json

iotDataClient = boto3.client("iot-data")

if len(sys.argv) != 2:
    print("Usage: createThingPolicy.py <policyName>")
    exit(1)

tName = sys.argv[1]

payload = json.dumps({
    "state": {
        "desired": {
            "welcome": None,
            "mode": 1,
            "questions": [1, 3, 2, 2, 1]
        },
        "reported": {
            "welcome": None,
            "mode": 1,
            "questions": [1, 3, 2, 2, 1]
        }
    }
})

response = iotDataClient.update_thing_shadow(
    thingName=tName,
    payload=payload
)

print(json.dumps(str(response), indent=4))