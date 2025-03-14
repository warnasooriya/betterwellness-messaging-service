const express = require("express");
const Availability = require("../models/Availability");
const router = express.Router();
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const User = require("../models/User");
const verifyToken = require('../middleware/cognitoAuth');
router.use(verifyToken)
const moment = require("moment-timezone");
const Messages = require("../models/Messages");
// Create a new event
router.get("/messages/:receiver/:sender", async (req, res) => {

    try {
        const messages = await Messages.find(
            {
                $or: [
                    { sender: req.params.sender, receiver: req.params.receiver },
                    { sender: req.params.receiver, receiver: req.params.sender }
                ]
            }
        ).sort({createdAt: 1});
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
    
});
 

module.exports = router;
