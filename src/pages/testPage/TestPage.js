import { AWSIoTProvider } from '@aws-amplify/pubsub';
import { Auth, PubSub } from 'aws-amplify'
import React, { useEffect } from 'react'

// Auth.currentCredentials().then(creds => console.log(creds));

const TestPage = () => {
  useEffect(() => {
    PubSub.subscribe("sdk/test/js", {provider: "AWSIoTProvider"}).subscribe({
      next: (data) => {
        console.log("Received message.");
        console.log(data.value);
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
      try{
        await PubSub.publish("sdk/test/js", {msg: "test123"});
        console.log("published data");
      } catch (e) {
        console.log(e);
      }
    }}>publish</button>
    </>
  )
}

export default TestPage