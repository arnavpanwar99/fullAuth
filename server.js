const express = require('express');
const app = express();
const http = require('http');
const cookieParser = require('cookie-parser');
require('dotenv').config();
require('./config/database').connect();
const server = http.createServer(app);
const userRoutes = require('./routes/user.routes');
const alertRoutes = require('./routes/alert.routes');
const pingRoutes = require('./routes/ping.routes');
const errorHandler = require('./middleware/error');
const PORT = process.env.PORT || 5000;

app.use(cookieParser());

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello world');
});

// custom routes
app.use('/users', userRoutes);
app.use('/alerts', alertRoutes);
app.use('/ping', pingRoutes);

// error handling
app.use(errorHandler);

server.listen(PORT, () => console.log('Server is live'));