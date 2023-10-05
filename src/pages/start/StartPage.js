import React, { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardActions, Typography, Fab, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { styled } from '@mui/system';
import AddIcon from '@mui/icons-material/Add';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_NAME = "colourRecognitionApi";

const StyledCard = styled(Card)(({ theme }) => ({
    margin: 20,
    backgroundColor: '#f5f5f5',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.4)', 
}));

const StyledFab = styled(Fab)(({ theme }) => ({
    position: 'fixed',
    // right: '0px',
    bottom: '50px',
    zIndex: 10,
}));


const StartPage = () => {
    const [deviceId, setDeviceId] = useState("");
    const [devices, setDevices] = useState([]);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        getDeviceData();
    }, []);  // Use an empty dependency array to ensure that this effect only runs once

    const getDeviceData = async () => {
        try {
            const response = await API.get(API_NAME, "/device", {});
            setDevices(response);
        } catch (error) {
            console.error("API Error:", error);
            toast.error("Failed to fetch devices.");
        }
    };

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const addDevice = async () => {
        if (deviceId) {
            try {
                const response = await API.post(API_NAME, `/device/${deviceId}/link`, {});
                if (response && response.userId) {
                    handleClose();
                    getDeviceData();
                    toast.success("Device added successfully!");
                } else {
                    toast.error("Failed to add device.");
                }
                
            } catch (error) {
                console.error("Link Device Error:", error);
                toast.error("Failed to add device.");
            }
        } else {
            toast.warn("Please enter a valid device ID.");
        }
    };

    return (
        <div>
            <Typography variant="h4" component="h2" style={{margin: '20px 0', color: '#3f51b5'}}>My Devices</Typography>
            {devices.length === 0 && <Typography variant="h6" component="p" style={{margin: '20px'}}>You don't have any devices linked yet.</Typography>}
            {devices.map(device => (
                <StyledCard key={device.deviceId}>
                    <CardContent>
                        <Typography variant="h5" component="div">
                            Device ID: {device.deviceId}
                        </Typography>
                        <Typography variant="body2">
                            User ID: {device.userId}
                        </Typography>
                    </CardContent>
                    <CardActions>
                        <Button size="small" onClick={() => navigate(`/device/${device.deviceId}`)}>View Details</Button>
                    </CardActions>
                </StyledCard>
            ))}
            <StyledFab color="primary" aria-label="add" onClick={handleOpen}>
                <AddIcon />
            </StyledFab>
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Add New Device</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please enter the device ID to link:
                    </DialogContentText>
                    <TextField autoFocus margin="dense" id="deviceId" label="Device ID" type="text" fullWidth onChange={(e) => setDeviceId(e.target.value)}/>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">Cancel</Button>
                    <Button onClick={addDevice} color="primary">Add</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default StartPage;

