var express = require('express');
var router = express.Router();
var functions = require('../helpers/functions');
var instructorHandler = require('../handlers/instructorHandler');


router.use(functions.middleware);

router.post('/addCertificates',instructorHandler.addCertificates);

router.get('/services',instructorHandler.services);

router.post('/addServices',instructorHandler.addServices);

router.post('/addPackages',instructorHandler.addPackages);

router.post('/bookingList',instructorHandler.bookingList);

router.post('/editProfile',instructorHandler.editProfile);

router.get('/getInstructorDetails',instructorHandler.getInstructorDetails);

router.get('/getPackages',instructorHandler.getPackages);

router.get('/getCertificates',instructorHandler.getCertificates);

router.post('/addLocation',instructorHandler.addLocation);

router.post('/addBankAccount',instructorHandler.addBankAccount);

router.get('/getBankAccount',instructorHandler.getBankAccount);

router.post('/cancelBooking',instructorHandler.cancelBooking);

router.post('/rejectBooking',instructorHandler.rejectBooking);

router.post('/acceptBooking',instructorHandler.acceptBooking);

router.post('/paymentReport',instructorHandler.paymentReport);

router.get('/deleteBankAccount',instructorHandler.deleteBankAccount);

module.exports = router;
