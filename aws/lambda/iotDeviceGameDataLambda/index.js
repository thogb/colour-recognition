const AWS = require('aws-sdk');
// import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
const {v4: uuidv4} = require("uuid");
    
const dynamo = new AWS.DynamoDB.DocumentClient();
const iotDataClient = new AWS.IotData({endpoint: "a45pn2rh93x2-ats.iot.ap-southeast-2.amazonaws.com"});
 
const tableName = "GameData";
 
exports.handler = async (event, context) => {
    const thingName = event.topic.split("/")[1];
    const start = new Date(event.start);
    const end = new Date(event.end);

    const dbItem = {
        deviceId: thingName ,
        gameId: uuidv4(),
        start: start.toISOString(),
        end: end.toISOString(),
        score: event.score,
        size: event.size,
        questions: event.questions,
        answers: event.answers,
    }
    
    const params = {
        TableName: tableName,
        Item: dbItem
    }
    
    try {
        await dynamo.put(params).promise();
        console.log("Succesfully added");
        iotDataClient.publish({
            topic: `${event.topic}/new`,
            payload: JSON.stringify(dbItem)
        }, function(err, data) {
            if(err) console.log(err, err.stack);
        })
    } catch (e) {
        console.error("Failed to add");
        console.error(e);
    }
};
