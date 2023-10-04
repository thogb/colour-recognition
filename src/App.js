import './App.css';
import { withAuthenticator, Button, Heading } from '@aws-amplify/ui-react';
import "@aws-amplify/ui-react/styles.css"
import TestPage from './pages/testPage/TestPage';
import { Amplify, Auth } from 'aws-amplify';
import awsExports from "./aws-exports"
import { AWSIoTProvider } from '@aws-amplify/pubsub';
import ApiCaller from './ApiCaller';


Amplify.configure(awsExports)
Amplify.addPluggable(
  new AWSIoTProvider({
    aws_pubsub_region: process.env.REACT_APP_AWS_PUBSUB_REGION,
    aws_pubsub_endpoint: process.env.REACT_APP_AWS_PUBSUB_ENDPOINT
  })
)

function App({signOut, user}) {
  console.log(process.env);
  return (
    <div className="App">
      <Heading level={1}>Hello {user.username}</Heading>
      <Button onClick={signOut}>Sign Out</Button>
      <div>{process.env.REACT_APP_AWS_PUBSUB_REGION}</div>
      <div>{process.env.REACT_APP_AWS_PUBSUB_ENDPOINT}</div>
      <TestPage/>
      <h1>API Caller Example</h1>
      <ApiCaller />
    </div>
  );
}

export default withAuthenticator(App);
