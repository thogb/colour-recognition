import './App.css';
import { withAuthenticator, Button, Heading } from '@aws-amplify/ui-react';
import "@aws-amplify/ui-react/styles.css"
import TestPage from './pages/testPage/TestPage';
import { Amplify } from 'aws-amplify';
import awsExports from "./aws-exports"
import { AWSIoTProvider } from '@aws-amplify/pubsub';

Amplify.configure(awsExports)
Amplify.addPluggable(
  new AWSIoTProvider({
    aws_pubsub_region: awsExports.aws_pubsub_region,
    aws_pubsub_endpoint: awsExports.aws_pubsub_endpoint
  })
)

function App({signOut, user}) {
  return (
    <div className="App">
      <Heading level={1}>Hello {user.username}</Heading>
      <Button onClick={signOut}>Sign Out</Button>
      <TestPage/>
    </div>
  );
}

export default withAuthenticator(App);
