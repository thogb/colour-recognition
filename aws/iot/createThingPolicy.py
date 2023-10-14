import boto3
import sys
import json

iotClient = boto3.client('iot')

if len(sys.argv) != 2:
    print("Usage: createThingPolicy.py <policyName>")
    exit(1)

tName = sys.argv[1]
pName = f"{tName}-p"

try:
    response = iotClient.describe_thing(
        thingName=tName
    )
except:
    print("Thing does not exist")
    exit(1)

pDoc = {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:Publish",
        "iot:Receive",
        "iot:PublishRetain"
      ],
      "Resource": [
        f"arn:aws:iot:ap-southeast-2:037876812924:topic/colourRecognition/{tName}/gameData/new",
        f"arn:aws:iot:ap-southeast-2:037876812924:topic/$aws/things/{tName}/shadow/get",
        f"arn:aws:iot:ap-southeast-2:037876812924:topic/$aws/things/{tName}/shadow/update",
        f"arn:aws:iot:ap-southeast-2:037876812924:topic/$aws/things/{tName}/shadow/get/*",
        f"arn:aws:iot:ap-southeast-2:037876812924:topic/$aws/things/{tName}/shadow/update/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iot:Subscribe",
      "Resource": [
        f"arn:aws:iot:ap-southeast-2:037876812924:topicfilter/colourRecognition/{tName}/gameData/new",
        f"arn:aws:iot:ap-southeast-2:037876812924:topicfilter/$aws/things/{tName}/shadow/update/*",
        f"arn:aws:iot:ap-southeast-2:037876812924:topicfilter/$aws/things/{tName}/shadow/get/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": f"arn:aws:iot:ap-southeast-2:037876812924:client/{tName}"
    },
    {
      "Effect": "Allow",
      "Action": "iot:GetThingShadow",
      "Resource": f"arn:aws:iot:ap-southeast-2:037876812924:thing/{tName}"
    }
  ]
}

try:
    response = iotClient.create_policy(
        policyName=pName,
        policyDocument=json.dumps(pDoc, indent=4)
    )
    print(json.dumps(response, indent=4))
except:
    print("Failed to create policy")
    exit(1)
