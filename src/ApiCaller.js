import React from 'react';
import { API } from 'aws-amplify';

const API_END_POINT = "https://d9by0b60tj.execute-api.ap-southeast-2.amazonaws.com/dev";
const API_NAME = "colourRecognitionApi";

const ApiCaller = () => {
    const getDeviceData = async () => {
        try {
            const response = await API.get(API_NAME, "/device", {});
            console.log("API Response:", response);
            return response;
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    };

    return (
        <div>
            <button onClick={getDeviceData}>Call API</button>
        </div>
    );
}

export default ApiCaller;
