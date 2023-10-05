import './App.css';
import { withAuthenticator, Button, Heading } from '@aws-amplify/ui-react';
import "@aws-amplify/ui-react/styles.css"
import { Amplify } from 'aws-amplify';
import awsExports from "./aws-exports"
import { AWSIoTProvider } from '@aws-amplify/pubsub';
import StartPage from './pages/start/StartPage';
import DevicePage from './pages/device/DevicePage.js'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AppBar, Toolbar, Typography, Container } from '@mui/material';
import styled from 'styled-components';

Amplify.configure(awsExports)
Amplify.addPluggable(
  new AWSIoTProvider({
    aws_pubsub_region: process.env.REACT_APP_AWS_PUBSUB_REGION,
    aws_pubsub_endpoint: process.env.REACT_APP_AWS_PUBSUB_ENDPOINT
  })
)

// const API_END_POINT = "https://d9by0b60tj.execute-api.ap-southeast-2.amazonaws.com/dev";

const StyledAppBar = styled(AppBar)`
    margin-bottom: 20px;
`;

const StyledToolbar = styled(Toolbar)`
    display: flex;
    justify-content: space-between;
`;

function App({signOut, user}) {
  // console.log(process.env);
  return (
    <Router>
      <div className="App">
        <StyledAppBar position="static" color="primary">
          <StyledToolbar>
            <Typography variant="h6">IoT Management Platform</Typography>
            <div>
              <Typography variant="subtitle1" style={{ display: 'inline-block', marginRight: '20px' }}>Hello, {user.username}</Typography>
              <Button color="inherit" onClick={signOut}>Sign Out</Button>
            </div>
          </StyledToolbar>
        </StyledAppBar>
        
        <Container>
          {/* <div>{process.env.REACT_APP_AWS_PUBSUB_REGION}</div>
          <div>{process.env.REACT_APP_AWS_PUBSUB_ENDPOINT}</div>
          <TestPage/> */}
          <Routes>
            <Route path="/" element={<StartPage />} />
            <Route path="/device/:deviceId" element={<DevicePage />} />
          </Routes>
        </Container>
        <ToastContainer />
      </div>
    </Router>
  );
}

export default withAuthenticator(App);