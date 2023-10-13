import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { API, PubSub } from 'aws-amplify';
import { toast } from 'react-toastify';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, Button, Grid, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, IconButton } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell, Label } from 'recharts';
import { styled } from '@mui/system';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

const ChartContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    [theme.breakpoints.down('sm')]: {
        flexDirection: 'column',
        alignItems: 'center'
    }
}));

const ChartItem = styled('div')(({ theme }) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    [theme.breakpoints.down('sm')]: {
        marginBottom: theme.spacing(2)
    }
}));

const API_NAME = "colourRecognitionApi";
const MODES = ["Training mode", "Game mode"];
const colorOptions = [1, 2, 3];  // Representing RED, GREEN, BLUE
const MAX_QUESTION_NUM = 7

const mapColorToString = (color) => {
    switch(color) {
        case 1: return "red";
        case 2: return "green";
        case 3: return "blue";
        case 0: return "waiting";
        default: return "invalid";
    }
};

const DevicePage = () => {
    const { deviceId } = useParams();
    const [gameData, setGameData] = useState([]);
    const [mode, setMode] = useState(0);
    const [questionsSettings, setQuestionsSettings] = useState([1, 2, 3]);
    const [tempQuestionsSettings, setTempQuestionsSettings] = useState([...questionsSettings]);
    const [openDialog, setOpenDialog] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const chartContainerRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(0);

    useEffect(() => {
        getDeviceGameData();
        const modeSubscription = PubSub.subscribe(`$aws/things/${deviceId}/shadow/update`, { provider: "AWSIoTProvider" }).subscribe({
            next: (data) => {
                setMode(data.value.state.desired.mode);
                console.log("Current Shadow Data:", data.value);
            },
            error: (err) => {
                console.error("Failed to get device mode:", err);
                toast.error("Failed to get device mode.");
            },
            complete: () => {
                console.log("done");
            }
        });

        const gameDataSubscription = PubSub.subscribe(`colourRecognition/${deviceId}/gameData/new`, { provider: "AWSIoTProvider" }).subscribe({
            next: (data) => {
                // setGameData([data.value, ...gameData]);
                console.log("New game data received:", data.value);
            },
            error: (err) => {
                console.error("Failed to get new game data:", err);
                toast.error("Failed to get new game data.");
            }
        });
    
        return () => {
            modeSubscription.unsubscribe();  // Cleanup on component unmount
            gameDataSubscription.unsubscribe();  // Cleanup on component unmount
        };
    }, []);  // only run when the page init

    useEffect(() => {
        if (chartContainerRef.current) {
            const containerWidth = chartContainerRef.current.offsetWidth;
            if (window.innerWidth <= 600) {
                setChartWidth(containerWidth);
            } else {
                setChartWidth(500);
            }
        }
    }, [chartContainerRef]);

    useEffect(() => {
        setTempQuestionsSettings([...questionsSettings]);
    }, [openDialog]);

    const getDeviceGameData = async () => {
        try {
            const response = await API.get(API_NAME, `/device/${deviceId}/gameData`, {});
            setGameData(response);
            console.log(response);
        } catch (error) {
            console.error("API Error:", error);
            toast.error("Failed to fetch game data.");
        }
    };

    const toggleMode = async () => {
        const newMode = (mode + 1) % 2;  // Toggle between 0 and 1
        try {
            await PubSub.publish(`$aws/things/${deviceId}/shadow/update`, { 
                state: {
                    desired: {
                        mode: newMode,
                        questions: questionsSettings
                    }
                }
            });
            setMode(newMode);
            toast.success(`Switched to ${MODES[newMode]}`);
        } catch (error) {
            console.error("Failed to change mode:", error);
            toast.error("Failed to change mode.");
        }
    };

    const handleAddQuestion = () => {
        if (tempQuestionsSettings.length < MAX_QUESTION_NUM) {
            setTempQuestionsSettings([...tempQuestionsSettings, 1]);  // Default added as RED
        }
    };

    const handleRemoveQuestion = (index) => {
        const newSettings = [...tempQuestionsSettings];
        newSettings.splice(index, 1);
        setTempQuestionsSettings(newSettings);
    };

    const handleQuestionChange = (index, value) => {
        const newSettings = [...tempQuestionsSettings];
        newSettings[index] = value;
        setTempQuestionsSettings(newSettings);
    };

    const handleSaveQuestions = async () => {
        if (tempQuestionsSettings.length >= 1 && tempQuestionsSettings.length <= MAX_QUESTION_NUM) {
            try {
                await PubSub.publish(`$aws/things/${deviceId}/shadow/update`, { 
                    state: {
                        desired: {
                            mode: mode,
                            questions: tempQuestionsSettings
                        }
                    }
                });
                setQuestionsSettings(tempQuestionsSettings);
                setOpenDialog(false);
                toast.success("Questions updated successfully!");
            } catch (error) {
                console.error("Failed to update questions:", error);
                toast.error("Failed to update questions.");
            }
        } else {
            toast.error(`Please set between 1 and ${MAX_QUESTION_NUM} questions.`);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };
    
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };
    
    // data analysis
    const scorePercentages = gameData.map(game => (game.score / game.size) * 100);
    const scoreCounts = [
        {range: "0%-25%", Count: scorePercentages.filter(p => p < 25).length},
        {range: "25%-50%", Count: scorePercentages.filter(p => p >= 25 && p < 50).length},
        {range: "50%-75%", Count: scorePercentages.filter(p => p >= 50 && p < 75).length},
        {range: "75%-100%", Count: scorePercentages.filter(p => p >= 75 && p < 100).length},
        {range: "100%", Count: scorePercentages.filter(p => p === 100).length},
    ];
    
    const colorCounts = gameData.reduce((acc, game) => {
        game.questions.forEach((question, index) => {
            const colorString = mapColorToString(question).toLowerCase();
            if (!acc[colorString]) {
                acc[colorString] = { total: 0, correct: 0 };
            }
            const isCorrect = question === game.answers[index];
            if (isCorrect) {
                acc[colorString].correct += 1;
            }
            acc[colorString].total += 1;
        });
        return acc;
    }, { red: { total: 0, correct: 0 }, green: { total: 0, correct: 0 }, blue: { total: 0, correct: 0 } });

    const chartData = Object.entries(colorCounts)
        .filter(([color]) => color !== "waiting")  // exclude the 'waiting' color
        .map(([color, data]) => ({
            color,
            Percentage: (data.correct / data.total) * 100
        }));

    const getBarColor = (colorName) => {
        switch (colorName) {
            case 'green':
                return '#90ee90'; // light green
            case 'red':
                return '#ff9999'; // light red
            case 'blue':
                return '#87cefa'; // light blue
            default:
                return '#8884d8'; // default color
        }
    };

    return (
        <div>
            <Typography variant="h4" component="h2" color="#3f51b5">Game Data for Device {deviceId}</Typography>
            <div>
                <Button variant="contained" color="primary" onClick={toggleMode} style={{marginTop: '1vh'}}>
                    Switch Mode
                </Button>
                <Typography>Current Mode: {MODES[mode]}</Typography>
            </div>
                
            <div>
                <Button variant="contained" color="secondary" onClick={() => setOpenDialog(true)} style={{margin: '1vh 0'}}>
                    Question Settings
                </Button>
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                    <DialogTitle>Question Settings</DialogTitle>
                    <DialogContent>
                        {tempQuestionsSettings.map((question, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', margin: '1vh 0' }}>
                                <FormControl variant="outlined" style={{ width: '80%', marginRight: '1vh' }}>
                                    <InputLabel>Color</InputLabel>
                                    <Select
                                        value={question}
                                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                                        label="Color"
                                    >
                                        {colorOptions.map(color => (
                                            <MenuItem key={color} value={color}>{mapColorToString(color).toUpperCase()}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <IconButton onClick={() => handleRemoveQuestion(index)}>
                                    <RemoveCircleOutlineIcon />
                                </IconButton>
                            </div>
                        ))}
                        {tempQuestionsSettings.length < MAX_QUESTION_NUM && (
                            <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddQuestion}>
                                Add Question
                            </Button>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDialog(false)} color="secondary">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveQuestions} color="primary">
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
            
            <Card style={{margin: '1vh 0'}}>
                <CardContent>
                    <ChartContainer ref={chartContainerRef}>
                        <ChartItem>
                            <Typography variant="h6" component="h3" style={{textAlign: 'center', color: '#6664b8'}}>Score Percentage Distribution</Typography>
                            <BarChart width={chartWidth} height={300} data={scoreCounts}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="range"/>
                                <YAxis/>
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Count" fill="#8884d8" />
                            </BarChart>
                        </ChartItem>
                        <ChartItem ref={chartContainerRef}>
                            <Typography variant="h6" component="h3" style={{textAlign: 'center', color: '#6664b8'}}>Color Accuracy</Typography>
                            <BarChart width={chartWidth} height={300} data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="color"/>
                                <YAxis/>
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Percentage" fill="#8884d8" >
                                    {
                                        chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={getBarColor(entry.color)} />)
                                    }
                                </Bar>
                            </BarChart>
                        </ChartItem>
                    </ChartContainer>
                </CardContent>
            </Card>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Start Time</TableCell>
                            <TableCell>End Time</TableCell>
                            <TableCell>Score</TableCell>
                            <TableCell>Questions</TableCell>
                            <TableCell>Answers</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {gameData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((game, index) => (
                            <TableRow key={index}>
                                <TableCell>{new Date(game.start).toLocaleString()}</TableCell>
                                <TableCell>{new Date(game.end).toLocaleString()}</TableCell>
                                <TableCell>{game.score}</TableCell>
                                <TableCell>{game.questions.map(q => mapColorToString(q)).join(', ')}</TableCell>
                                <TableCell>{game.answers.map(a => mapColorToString(a)).join(', ')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={gameData.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </TableContainer>
        </div>
    );
}

export default DevicePage;
