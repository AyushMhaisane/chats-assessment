const express = require('express');
const cors = require('cors');
const ConnectDB = require('./config/db');

// Load environment variables
const dotenv = require('dotenv')
dotenv.config();

const app = express();

// Connect to Database
ConnectDB();

// Middlewarea

app.use(cors());
app.use(express.urlencoded({ extended: false }))
app.use(express.json());


// Routes
app.use('/api/articles', require('./routes/articleRoutes'));
 
// Start Server
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server started on port ${port}`));



