/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/

const { IoTClient, DescribeThingCommand } = require("@aws-sdk/client-iot");
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const bodyParser = require('body-parser')
const express = require('express')

const ddbClient = new DynamoDBClient({ region: process.env.TABLE_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const iotClient = new IoTClient({ region: process.env.TABLE_REGION });

let tableName = "UserDevice-dev";
// if (process.env.ENV && process.env.ENV !== "NONE") {
//   tableName = tableName + '-' + process.env.ENV;
// }
const tableGameData = "GameData";

const userIdPresent = false; // TODO: update in case is required to use that definition
const partitionKeyName = "userId";
const partitionKeyType = "S";
const sortKeyName = "deviceId";
const sortKeyType = "S";
const hasSortKey = sortKeyName !== "";
const path = "/device";
const UNAUTH = 'UNAUTH';
const hashKeyPath = '/:' + partitionKeyName;
const sortKeyPath = hasSortKey ? '/:' + sortKeyName : '';

// declare a new express app
const app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
});

// convert url string param to expected Type
const convertUrlType = (param, type) => {
  switch(type) {
    case "N":
      return Number.parseInt(param);
    default:
      return param;
  }
}

const getUserId = (request) => {
    return request.apiGateway.event.requestContext.identity.cognitoIdentityId || UNAUTH;
}

const userOwnDevice = async (userId, deviceId) => {
  const getPrams = {
    TableName: tableName,
    Key: {
      userId,
      deviceId
    }
  }

  try {
    const data = await ddbDocClient.send(new GetCommand(getPrams));
    if (data.Item) {
      return true;
    }
  } catch (e) {
    return false;
  }
  
  return false;
}

const doesThingExist = async (deviceId) => {
  try {
    const data = await iotClient.send(new DescribeThingCommand({
      thingName: deviceId
    }));

    if (data.thingId) {
      return true;
    }
  } catch (e) {

  }

  return false;
}

app.get(path + "/:deviceId" + "/exist", async function(req, res) {
  const userId = getUserId(req);
  const deviceId = req.params.deviceId;

  try {
    const exists = doesThingExist(deviceId);
    res.json({exists: exists})
  } catch (err) {
    res.statusCode = 500;
    res.json({error: 'Could not load items: ' + err.message});
  }
});

app.get(path, async function(req, res) {
  const userId = getUserId(req);

  var params = {
    TableName: tableName,
    KeyConditionExpression: '#userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ExpressionAttributeNames: {
      '#userId': "userId"
    },
  };

  try {
    const data = await ddbDocClient.send(new QueryCommand(params));
    res.json(data.Items);
  } catch (err) {
    res.statusCode = 500;
    res.json({error: 'Could not load items: ' + err.message});
  }
});

app.post(path + "/:deviceId" + "/link", async function(req, res) {
  const userId = getUserId(req);
  const deviceId = req.params.deviceId;
  const paramBody = {
    userId, 
    deviceId
  };

  const params = {
    TableName: tableName,
    Item: paramBody
  };

  const thingExist = doesThingExist(deviceId);

  if (!thingExist) {
    res.statusCode = 404;
    res.json({error: 'Device does not exist'});
    return;
  }

  try{
    const data = await ddbDocClient.send(new PutCommand(params));
    res.json(paramBody);
  } catch (err) {
    res.statusCode = 500;
    res.json({error: 'Could not load items: ' + err.message});
  }
});

app.get(path + "/:deviceId" + "/gamedata", async function(req, res){
  const userId = getUserId(req);
  const deviceId = req.params.deviceId;

  if (! (await userOwnDevice(userId, deviceId))) {
    res.statusCode = 401;
    res.json({error: 'Unauthorized'});
  }

  const params = {
    TableName: tableGameData,
    KeyConditionExpression: '#deviceId = :deviceId',
    ExpressionAttributeValues: {
      ':deviceId': deviceId
    },
    ExpressionAttributeNames: {
      '#deviceId': 'deviceId'
    }
  };

  try {
    const data = await ddbDocClient.send(new QueryCommand(params));
    res.json(data.Items);
  } catch (err) {
    res.statusCode = 500;
    res.json({error: 'Could not load items: ' + err.message});
  }
});

app.listen(3000, function() {
  console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app