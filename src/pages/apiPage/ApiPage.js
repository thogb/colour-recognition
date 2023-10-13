import { API } from 'aws-amplify';
import React from 'react'

const API_END_POINT = "https://d9by0b60tj.execute-api.ap-southeast-2.amazonaws.com/dev"
const API_NAME = "colourRecognitionApi"

const ApiPage = () => {

    const getDevice =  async () => {
        console.log("getdevice");
        API.get(
            API_NAME,
            "/device",
            {}
        ).then(res => console.log(res)).catch(err => console.log(err))
    }

    const getGameData = async () => {
        console.log("getGameData");
        API.get(
            API_NAME,
            "/device/testThing/gamedata",
            {}
        ).then(res => console.log(res)).catch(err => console.log(err))
    }

    const linkDevice = async () => {
        console.log("link device");
        API.post(
            API_NAME,
            "/device/testThing/link",
            {}
        ).then(res => console.log(res)).catch(err => console.log(err))
    }

    const getShadow = async () => {
        console.log("link device");
        API.get(
            API_NAME,
            "/device/testThing/shadow",
            {}
        ).then(res => console.log(res)).catch(err => console.log(err))
    }

  return (
    <>
        <button onClick={getDevice}>getDevice</button>
        <button onClick={getGameData}>getGameData</button>
        <button onClick={linkDevice}>linkDevice</button>
        <button onClick={getShadow}>getShadow</button>
    </>
  )
}

export default ApiPage