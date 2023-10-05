import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API } from 'aws-amplify';
import { toast } from 'react-toastify';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell, Label } from 'recharts';

const API_NAME = "colourRecognitionApi";
const TOTAL_SCORE = 5;

const DevicePage = () => {
    const { deviceId } = useParams();
    const [gameData, setGameData] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        getDeviceGameData();
    }, []);

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
                return '#90ee90'; // 浅绿色
            case 'red':
                return '#ff9999'; // 浅红色
            case 'blue':
                return '#87cefa'; // 浅蓝色
            default:
                return '#8884d8'; // 默认颜色
        }
    };

    return (
        <div>
            <Typography variant="h4" component="h2" style={{margin: '20px 0', color: '#3f51b5'}}>Game Data for Device {deviceId}</Typography>
            <Card style={{margin: '10px 0'}}>
                <CardContent>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                            <Typography variant="h6" component="h3" style={{textAlign: 'center', marginBottom: '2px', color: '#6664b8'}}>Score Distribution</Typography>
                            <BarChart width={500} height={300} data={scoreCounts}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="score"/>
                                <YAxis/>
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Count" fill="#8884d8" />
                            </BarChart>
                        </div>
                        <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                            <Typography variant="h6" component="h3" style={{textAlign: 'center', marginBottom: '2px', color: '#6664b8'}}>Color Accuracy</Typography>
                            <BarChart width={500} height={300} data={chartData}>
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
                        </div>
                    </div>
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
