const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http"); // <-- ensure http is imported
require("dotenv").config();
const corsOptions = require('./config/corsOptions');
const startPolling = require('./consumer');
const app = express();
const port = process.env.PORT || 5003;
const { Server } = require('socket.io');
const { initSocket } = require('./socket');


// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Create HTTP server and attach socket.io to it
const server = http.createServer(app);
initSocket(server);
 


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.log("Error connecting to MongoDB", err));

// Import and use your routes, pass io and connectedUsers to router
const messageRouter = require("./routes/messageRouter");
app.use("/api", messageRouter);

 

// Start single HTTP server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  startPolling();
});

 
