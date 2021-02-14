var express = require('express');
var router = express.Router();
var functions = require('../helpers/functions');
var userHandler = require('../handlers/userHandler');
/* GET users listing. */




router.use(functions.middleware);

router.post('/getNearByInstructors',userHandler.getNearByInstructors);

router.get('/getNearByinstructorDetails',userHandler.getNearByinstructorDetails);

router.post('/myBookings',userHandler.myBookings);

router.get('/getBookingDetail',userHandler.getBookingDetail);

router.post('/addCard',userHandler.addCard);

router.get('/getUserStripeCards',userHandler.getUserStripeCards);

router.post('/rateInstructor',userHandler.rateInstructor);

router.post('/cancelBooking',userHandler.cancelBooking);

router.post('/bookPackages',userHandler.bookPackages);

router.post('/getAllMessagedPersons',userHandler.getAllMessagedPersons);

router.post('/getChatsBtwTwo',userHandler.getChatsBtwTwo);

router.post('/deleteCard',userHandler.deleteCard);


module.exports = router;
