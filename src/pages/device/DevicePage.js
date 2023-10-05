import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API } from 'aws-amplify';
import { toast } from 'react-toastify';

const API_NAME = "colourRecognitionApi";

const DevicePage = () => {
    const { deviceId } = useParams();  // use useParams to get the parameter in the URL

    useEffect(() => {
        getDeviceGameData();
    }, []);

    const getDeviceGameData = async () => {
        try {
            const response = await API.get(API_NAME, `/device/${deviceId}/gameData`, {});
            console.log(response)
        } catch (error) {
            console.error("API Error:", error);
            toast.error("Failed to fetch devices.");
        }
    };

    return (
        <div>
            Current device id: {deviceId}
        </div>
    );
}

export default DevicePage;
