const express = require('express');
const http = require('http');
const axios = require('axios');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const startingPoint = { lat: 8.5233, lng: 76.9559 };
const endingPoint = { lat: 8.5239, lng: 76.9633 };
let waypoints = [];
let routePolyline = [];

async function fetchRoute() {
    try {
        const url = `http://router.project-osrm.org/route/v1/driving/${startingPoint.lng},${startingPoint.lat};${endingPoint.lng},${endingPoint.lat}?overview=full&geometries=geojson`;
        const response = await axios.get(url);
        const route = response.data.routes[0].geometry.coordinates;

        waypoints = route.map(([lng, lat]) => ({ lat, lng }));
        routePolyline = waypoints; 
    } catch (error) {
        console.error('Error fetching route:', error);
    }
}

app.get('/api/route', async (req, res) => {
    await fetchRoute();
    res.json({ startingPoint, endingPoint, routePolyline });
});

io.on('connection', (socket) => {
    console.log('Client connected');

    socket.emit('routeUpdate', { startingPoint, endingPoint, routePolyline });

    let currentWaypointIndex = 0;

    const intervalId = setInterval(() => {
        if (currentWaypointIndex < waypoints.length - 1) {
            currentWaypointIndex += 1;
            const nextPoint = waypoints[currentWaypointIndex];

            socket.emit('routeUpdate', { startingPoint: nextPoint, endingPoint, routePolyline });
        } else {
            clearInterval(intervalId); 
        }
    }, 1000);

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        clearInterval(intervalId);
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
