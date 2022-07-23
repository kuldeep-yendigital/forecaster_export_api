const express = require('express');
const config = require('../config');
const eventService = require('../lib/eventservice');
const router = express.Router();



router.get('/events', function (req, res) {
    const id = req.auth.sub;
    try {
        eventService.addConnection(req, res, id);
    } catch (e) {
        console.log(e);
    }
});








module.exports = router;