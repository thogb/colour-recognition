import { AWSIoTProvider } from '@aws-amplify/pubsub';
import { Auth, PubSub } from 'aws-amplify'
import React, { useEffect } from 'react'

// Auth.currentCredentials().then(creds => console.log(creds));

const TestPage = () => {
  console.log("initalising pubsub");
  useEffect(() => {
    PubSub.subscribe("sdk/test/js", {provider: "AWSIoTProvider"}).subscribe({
      next: (data) => {
        console.log("test");
        console.log("message: ", data);
      },
      error: (err) => {
        console.log("error");
        console.log(err);
      },
      complete: () => {
        console.log("done");
      }
    })
  }, [])
  

  return (
    <>
    <div>TestPage</div>
    <button onClick={ async () =>  {
      console.log("plubishing");
      try{
        // PubSub.addPluggable(
        //   new AWSIoTProvider({
        //     aws_pubsub_region: process.env.REACT_APP_AWS_PUBSUB_REGION,
        //     aws_pubsub_endpoint: process.env.REACT_APP_AWS_PUBSUB_ENDPOINT
        //   })
        // )

        await PubSub.publish("sdk/test/js", {msg: "test"});
      } catch (e) {
        console.log(e);
      }
      console.log("finsih pub");
    }}>publish</button>
    </>
  )
}

export default TestPage