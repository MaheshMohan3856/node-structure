var express = require('express');
var router = express.Router();
var functions = require('../helpers/functions');
var authHandler = require('../handlers/authHandler');


router.post('/login',authHandler.login);

router.get('/config',authHandler.config);

router.post('/register',authHandler.register);

router.post('/fbLogin',authHandler.fbLogin);

router.post('/verifyOtp',authHandler.verifyOtp);

router.post('/sendOtp',authHandler.sendOtp);

router.post('/resetPassword',authHandler.resetPassword);

router.use(functions.middleware);

router.post('/changePassword',authHandler.changePassword);








module.exports = router;