import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { API, PubSub } from 'aws-amplify';
import { toast } from 'react-toastify';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, Button, Grid } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell, Label } from 'recharts';
import { styled } from '@mui/system';

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
const TOTAL_SCORE = 5;
const MODES = ["Training mode", "Game mode"];

const DevicePage = () => {
    const { deviceId } = useParams();
    const [gameData, setGameData] = useState([]);
    const [mode, setMode] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const chartContainerRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(0);

    useEffect(() => {
        getDeviceGameData();
        const subscription = PubSub.subscribe(`colourRecognition/${deviceId}/mode`, { provider: "AWSIoTProvider" }).subscribe({
            next: (data) => {
                setMode(data.value.mode);
                console.log("Current mode:", data.value.mode);
            },
            error: (err) => {
                console.error("Failed to get device mode:", err);
                toast.error("Failed to get device mode.");
            },
            complete: () => {
              console.log("done");
            }
        });
        return () => subscription.unsubscribe();  // Cleanup on component unmount
    }, []);

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
            await PubSub.publish(`colourRecognition/${deviceId}/mode`, { mode: newMode });
            console.log(`colourRecognition/${deviceId}/mode`);
            setMode(newMode);
            toast.success(`Switched to ${MODES[newMode]}`);
        } catch (error) {
            console.error("Failed to change mode:", error);
            toast.error("Failed to change mode.");
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
    const scoreCounts = Array.from({ length: TOTAL_SCORE + 1 }, (_, i) => ({
        score: i,
        Count: gameData.filter(game => game.score === i).length
    }));

    const colorCounts = gameData.reduce((acc, game) => {
        game.questions.forEach((question, index) => {
            const isCorrect = question === game.answers[index];
            if (isCorrect) {
                acc[question].correct += 1;
            }
            acc[question].total += 1;
        });
        return acc;
    }, { green: { total: 0, correct: 0 }, red: { total: 0, correct: 0 }, blue: { total: 0, correct: 0 } });

    const chartData = Object.entries(colorCounts).map(([color, data]) => ({
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
            <Grid container justifyContent="space-between" alignItems="center" style={{margin: '2vh 0'}}>
                <Typography variant="h4" component="h2" color="#3f51b5">Game Data for Device {deviceId}</Typography>
                <div>
                    <Button variant="contained" color="primary" onClick={toggleMode}>
                        Switch Mode
                    </Button>
                    <Typography style={{marginLeft: '2vh'}}>Current Mode: {MODES[mode]}</Typography>
                </div>
            </Grid>
            <Card style={{margin: '1vh 0'}}>
                <CardContent>
                    <ChartContainer ref={chartContainerRef}>
                        <ChartItem>
                            <Typography variant="h6" component="h3" style={{textAlign: 'center', color: '#6664b8'}}>Score Distribution</Typography>
                            <BarChart width={chartWidth} height={300} data={scoreCounts}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="score"/>
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
                                <TableCell>{game.questions.join(', ')}</TableCell>
                                <TableCell>{game.answers.join(', ')}</TableCell>
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
