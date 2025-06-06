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
const { initSocket } = require('./socket');

const requestLogger = require('./middleware/requestLogger');
const errorLogger = require('./middleware/errorLogger');

// Middleware
app.use(cors());
app.options('*', cors()); // Handle preflight requests
app.use(bodyParser.json());

app.use(express.json());
app.use(requestLogger);

// Create HTTP server and attach socket.io to it
const server = http.createServer(app);
initSocket(server);
 


// MongoDB connection
const cleanMongoUri = process.env.MONGODB_URI?.replace(/^"(.*)"$/, "$1");
mongoose.connect(cleanMongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.log("Error connecting to MongoDB", err));


// Import and use your routes, pass io and connectedUsers to router
const messageRouter = require("./routes/messageRouter");
app.use("/messaging", messageRouter);

app.get('/messaging/health', (req, res) => {
  res.json({ status: 'ok', traceId: req.traceId });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', traceId: req.traceId });
});
 
app.use(errorLogger);


// Start single HTTP server
server.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
  startPolling();
});

 
