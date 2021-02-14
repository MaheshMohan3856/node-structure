let express = require('express'),
jwt = require('jsonwebtoken'),
moment = require('moment'),
functions = require('../helpers/functions'),
randomstring = require('randomstring'),
randToken = require('rand-token'),
fs = require('fs'),
config = require('../server/config'),
dateformat = require('dateformat'),
user = require('../dao/userDao'),
emailValidator = require('email-validator'),
stripe = require('../helpers/stripeLib'),
each = require('async-each-series'),
app = express();

let userHandler = {

    getNearByInstructors(req,res,next){

          if(!req.body.page) res.json({"status":false,"function":"getNearByInstructors","message":"Page is required"});

          else{

               let offset = ((req.body.page - 1) * 10) ;

               let limit = 10, distance = '', instructor_count = '';
               
               user.getDefaultDistance()
               .then((response)=>{

                    distance = response[0].value;

                    return user.getInstructorCount(distance,req.body.lat,req.body.lng,req.body.sortBy,req.body.filter);
               })
               .then((count)=>{

                    
                    if(count.length){
                         instructor_count = count[0].instructor_count;
                    }else{
                         instructor_count = 0;
                    }
                    
                    
                    return user.getInstructor(distance,req.body.lat,req.body.lng,offset,limit,req.body.sortBy,req.body.filter);

               })
               .then((result)=>{

                    if(result.length){
                    
                         res.json({"status":true,"function":"getNearByInstructors","data":result,"count":instructor_count});
                    }else{

                         res.json({"status":true,"function":"getNearByInstructors","data":[],"count":instructor_count});//getNearByInstructors
                    }

                    
               })
               .catch((err)=>{
                    console.log(err);
                    res.json({"status":false,"function":"getNearByInstructors","message":"Connection error"});
               })

          } 
        
           
    },
    getNearByinstructorDetails(req,res,next){

     

     let instructor_id = req.query.instructor_id;
        
       

          let instructorDetail = {}, packageList = [], serviceList = [], ratingList = [];

           user.getInstructorDetails(instructor_id)
           .then((result)=>{
                
                if(!result.length) res.json({"status":false,"function":"getNearByinstructorDetails","message":"Invalid instructor id"});

                else{

                    instructorDetail = result[0];

                    return user.getInstructorPackages(instructor_id);
                }
           })
           .then((response)=>{

                if(!response.length) res.json({"status":false,"function":"getNearByinstructorDetails","message":"Database error"});

                else{
                    
                    packageList = response;

                    return user.getInstructorServices(instructor_id);
                }
           })
           .then((services)=>{

                if(!services.length) res.json({"status":false,"function":"getNearByinstructorDetails","message":"Database error"});

                else{

                    serviceList = services;

                    return user.getInstructorRating(instructor_id);
                }
           })
           .then((ratings)=>{

               ratingList = ratings;

               var data = {

                    instructorDetail: instructorDetail,
                    packageList: packageList,
                    serviceList: serviceList,
                    ratingList: ratingList
               }

               res.json({"status":true,"function":"getNearByinstructorDetails","data":data});
           })
           .catch((err)=>{

               res.json({"status":false,"function":"getNearByinstructorDetails","error":err,"message":"Connection error"})
           })
  },

  myBookings(req,res,next){

     let decoded = req.decoded;

     let user_id = decoded.user_id;

     user.getMyBookings(user_id,req.body.search,req.body.sortBy,req.body.filter)
     .then((response)=>{

          if(!response.length) res.json({"status":true, "function":"myBookings","message":"No booking found","data":[]});

          else res.json({"status":true, "function":"myBookings","data":response});
     })
  },

  getBookingDetail(req,res,next){

     let decoded = req.decoded;

     let user_id = decoded.user_id;

     let instructorDetail = {};

     if(!req.query.booking_id) res.json({"status":false,"function":"getBookingDetail","message":"Booking id required"});

     else{
        
          user.getBookingDetails(user_id,req.query.booking_id)
          .then((response)=>{
              
               if(!response.length) res.json({"status":false,"function":"getBookingDetail","message":"Database error"});

               else{

                    instructorDetail = response[0];

                   return user.getInstructorRating(instructorDetail.instructor_id);
               }

          })
          .then((ratings)=>{

               

               var data = {

                    instructorDetail: instructorDetail,
                    ratingList: ratings
               }

               res.json({"status":true,"function":"getBookingDetail","data":data});
           })
           .catch((err)=>{

               res.json({"status":false,"function":"getBookingDetail","error":err,"message":"Connection error"})
           })
     }

     
  },
  addCard(req,res,next){

      var decoded = req.decoded;

      let user_id = decoded.user_id;

      let stripe_id = '';

      if(!req.body.card_token) res.json({"status":false,"function":"addCard","message":"Card token required"});

      else{

     
      user.getStripeId(user_id)
      .then((result)=>{

          if(!result.length) res.json({"status":false,"function":"addCard","message":"User doesnot have a stripe account"});

          else {

               stripe_id = result[0].stripe_id;

               return stripe.createCard(stripe_id,req.body.card_token);
          }
      })
      .then((response)=>{

          if(!response.status) res.json({"status":false,"function":"addCard","message":"Stripe error","error":response.err});

          else{

               return stripe.getAllCards(stripe_id);
          }
      })
      .then((cards)=>{

           res.json({"status":true,"function":"addCard","message":"Card added successfully","data":cards.cards});
      })
      .catch((err)=>{

          res.json({"status":false,"function":"addCard","message":"Connection error","error":err});
      })

     }
  },

  getUserStripeCards(req,res,next){

        let decoded = req.decoded;

        let user_id = decoded.user_id;

        

        user.getStripeId(user_id)
        .then((result)=>{

          console.log("koiifddf",result);

               if(!result.length) res.json({"status":false,"function":"getUserStripeCards","message":"User does not have a stripe account"});

               else{
                    

                    return stripe.getAllCards(result[0].stripe_id);
               }
        })
        .then((cards)=>{

          console.log("cards",cards)

            if(!cards.status) res.json({"status":false,"function":"getUserStripeCards","message":"Stripe error"});

            else  res.json({"status":true,"function":"getUserStripeCards","message":"Cards fetched successfully","data":cards.cards});
        })
        .catch((err)=>{

            res.json({"status":false,"function":"getUserStripeCards","message":"Connection error","error":err});
        })

        

   },

   rateInstructor(req,res,next){
     
     let decoded = req.decoded;

     let user_id = decoded.user_id;

     if(!req.body.rating) res.json({"status":false,"function":"rateInstructor","message":"Rating is required"});

     else if(!req.body.review) res.json({"status":false,"function":"rateInstructor","message":"Review is required"});

     else if(!req.body.instructor_id) res.json({"status":false,"function":"rateInstructor","message":"Instructor id required"});

     else{

          let param = {

               ratings: req.body.rating,
               reviews: req.body.review,
               instructor_id: req.body.instructor_id,
               user_id: user_id,
               review_date: moment().format('YYYY-MM-DD HH:mm:ss')

          }

          functions.insert("ratings_master",param)
          .then((result)=>{

               if(!result.insertId) res.json({"status":false,"function":"rateInstructor","message":"Database error"});

               else {
                    res.json({"status":true,"function":"rateInstructor","message":"Successfully rated and reviewed"});
               }
          })
          .catch((err)=>{

               console.log("error",err);
               res.json({"status":false,"function":"rateInstructor","message":"Connecton error","error":err});
          })
     }
   },
   bookPackages(req,res,next){
    
      let decoded = req.decoded;

      let user_id = decoded.user_id;

      let bookingDetail = {};
       
      if(!req.body.date) res.json({"status":false,"function":"bookPackage","message":"Booking date required"});

      else if(!req.body.package_id) res.json({"status":false,"function":"bookPackages","message":"Package is required"});

      else if(!req.body.cardId) res.json({"status":false,"function":"bookPackages","message":"Card token required"});

      else {
        
          user.getInstructorFromPackageId(req.body.package_id)
          .then((result)=>{

               if(!result.length) res.json({"status":false,"function":"bookPackages","message":"Package does not exist"});

               else {

                    let booking_id = 'HONU' + randomstring.generate({
                         length: 6,
                         charset: 'numeric'
                       });
                    bookingDetail = {

                       user_id : user_id,
                       booking_date : req.body.date,
                       package_id : req.body.package_id,
                       instructor_id : result[0].instructor_id,
                       status : 'New',
                       booking_id : booking_id,
                       card_token : req.body.cardId

                    }

                    return functions.insert('bookings',bookingDetail);
               }
                    
          })
          .then((response)=>{

               if(!response.insertId) res.json({"status":false,"function":"bookPackage","message":"Booking failed"});

               else res.json({"status":true,"function":"bookPackage","message":"Booking done successfully"});
          })
          .catch((err)=>{

               res.json({"status":false,"function":"bookPackage","message":"Connection error","error":err});
          })

      }



   },
   cancelBooking(req,res,next){

     if(!req.body.booking_id) res.json({"status":false,"function":"cancelBooking","message":"Bookng id required"});

     else{

         user.getTransactionId(req.body.booking_id)
         .then((result)=>{

             if(!result.length) res.json({"status":false,"function":"cancelBooking","message":"No transaction done against this booking"});

             else {
                  if(result[0].transaction_id == null){

                       return true;

                  }else{
                    
                    return stripe.refundAmount(result[0].transaction_id, true);
                  }
                  

             }
         })
         .then((response)=>{

             if(!response) res.json({"status":false,"function":"cancelBooking","message":"Stripe error"});

             else {

                   let updates = {};

                    if(response.id){
                            
                         updates = {
                              refund_id : response.id,
                              status : 'Cancelled',
                              cancelled_by : 'user'
                         }
                    }else{
                        
                         updates = {
                               status : 'Cancelled',
                              cancelled_by : 'user'
                         }

                    }
                    

               
                 return functions.update('bookings',updates,{booking_id:req.body.booking_id});
             }
         })
         .then((updated)=>{

             if(!updated.affectedRows) res.json({"status":false,"function":"cancelBooking","message":"Database error"});

             else return functions.update('payment_reports',{status:'cancelled'},{booking_id:req.body.booking_id});
               
          })
          .then((payment)=>{
             
              res.json({"status":true,"function":"cancelBooking","message":"Booking cancelled"});

          })
         .catch((err)=>{

             console.log(err);
             res.json({"status":false,"function":"cancelBooking","message":"Connection error"});
         })
     }
   },

   getAllMessagedPersons(req,res,next){

       let decoded = req.decoded;
       
       let user_id = decoded.user_id;

       user.getAllMessages(user_id)
       .then((result)=>{
             
          if(!result.length) res.json({"status":true,"function":"getAllMessagedPersons","data":[]});

          else res.json({"status":true,"function":"getAllMessagedPersons","data":result});
       })
       .catch((err)=>{

          console.log(err);
          res.json({"status":false,"function":"getAllMessagedPersons","message":"Connection error"});
      })


   },

   getChatsBtwTwo(req,res,next){

      let decoded = req.decoded;

      let user_id = decoded.user_id;

      if(!req.body.chattedUser) res.json({"status":false,"function":"getChatsBtwTwo","message":"Chatted user required"});

      user.getChatsBtwTwo(user_id,req.body.chattedUser)
      .then((result)=>{
         
          if(!result.length) res.json({"status":true,"function":"getChatsBtwTwo","data":[]});

          else res.json({"status":true,"function":"getChatsBtwTwo","data":result});
      })
      .catch((err)=>{

          console.log(err);
          res.json({"status":false,"function":"getChatsBtwTwo","message":"Connection error"});
      })

   },

   deleteCard(req,res,next){

     let decoded = req.decoded;

     let user_id = decoded.user_id;

     if(!req.body.cardToken) res.json({"status":false,"function":"deleteCard","message":"Card token is required"});

     else{

          user.getStripeId(user_id)
          .then((stripeId)=>{
                 
               if(!stripeId.length) res.json({"status":false,"function":"deleteCard","message":"Database error"});

               else return stripe.deleteCard(stripeId[0].stripe_id, req.body.cardToken);
          })
          .then((deleted)=>{

               if(deleted.deleted != true) res.json({"status":false,"function":"deleteCard","message":"Card not deleted"});

               else res.json({"status":true,"function":"deleteCard","message":"Card deleted successfully"});
          })
          .catch((err)=>{
             
               console.log(err);
               res.json({"status":false,"function":"deleteCard","message":"Connection error"});
          })
     }
   }

    
}

module.exports = userHandler