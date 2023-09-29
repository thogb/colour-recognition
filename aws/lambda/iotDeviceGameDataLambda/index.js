const AWS = require('aws-sdk');
const {v4: uuidv4} = require("uuid");
    
const dynamo = new AWS.DynamoDB.DocumentClient();

/**
 * Demonstrates a simple HTTP endpoint using API Gateway. You have full
 * access to the request and response payload, including headers and
 * status code.
 *
 * To scan a DynamoDB table, make a GET request with the TableName as a
 * query string parameter. To put, update, or delete an item, make a POST,
 * PUT, or DELETE request respectively, passing in the payload to the
 * DynamoDB API as a JSON body.
 */
 
 const tableName = "GameData";
 
exports.handler = async (event, context) => {
    const thingName = event.topic.split("/")[1];
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    const params = {
        TableName: tableName,
        Item: {
            deviceId: thingName ,
            gameId: uuidv4(),
            start: start.toISOString(),
            end: end.toISOString(),
            score: event.score,
            size: event.size,
            questions: event.questions,
            answers: event.answers,
        }
    }
    
    try {
        await dynamo.put(params).promise();
        console.log("Succesfully added");
    } catch (e) {
        console.error("Failed to add");
        console.error(e);
    }
};
