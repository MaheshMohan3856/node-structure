let express = require('express'),
jwt = require('jsonwebtoken'),
moment = require('moment'),
functions = require('../helpers/functions'),
randomstring = require('randomstring'),
randToken = require('rand-token'),
fs = require('fs'),
config = require('../server/config'),
dateformat = require('dateformat'),
instruct = require('../dao/instructorDao'),
emailValidator = require('email-validator'),
stripe = require('../helpers/stripeLib'),
each = require('async-each-series'),
app = express();


let instructorHandler = {

    addCertificates(req,res,next){

        var decoded = req.decoded;
    
        let certificateLength = JSON.parse(req.body.certificates).length;
    
        let certification = JSON.parse(req.body.certificates);
    
        let instructor_id = decoded.user_id;
        
        if(certificateLength>0){
    
    
            instruct.updateCertificateAdded(instructor_id)
            .then((response)=>{
    
                if(!response.affectedRows) res.json({"status":false,"function":"addCertificates","message":"Database error."});
                 
                else {
    
                    return instruct.deleteExistingCertificates(instructor_id);
   
                }
                
            })
            .then((result)=>{

                each(certification, function(el, next) {
                    setTimeout(function () {
                        let addParam = {
                            instructor_id : instructor_id,
                            certificate_name : el.certificate_name,
                            authority_name : el.authority_name,
                            document_id : el.document_id,
                            certificate : el.file
                            
                        }
                        functions.insert('certifications', addParam);
                      next();
                    }, Math.random() * 5000);
                  }, function (err) {
                       if(err == undefined){

                            res.json({"status":true,"function":"addCertificates","message":"Certificates updated"});

                       }else{
                           
                           res.json({"status":false,"function":"addCertificates","message":"Database error"});
                       }
                  });
              
                  
            })
            .catch((err)=>{
                console.log(err);
                res.json({"status":false,"function":"addCertificates","error":err,"message":"Connection error"})
            })
    
        }else{
            
            res.json({"status":false,"function":"addCertificates","message":"No certificates produced"});
        }
    },
    services(req,res,next){

        let decoded = req.decoded;

        let instructor_id = decoded.user_id;
    
        instruct.getAllServices(instructor_id)
       .then((response)=>{
           if(response.length > 0){
    
                res.json({"status":true,"function":"services","message":"Services fetched successfully","data":response});
          
            }else{
              
                res.json({"status":false,"function":"services","message":"No service available"});
           }
       })
       .catch((err)=>{
           console.log(err);
           res.json({"status":false,"function":"services","message":"Connection error"});
       })
    },


    addServices(req,res,next){
        
         if(!req.body.serviceIds) res.json({"status":false,"function":"addServices","message":"Please provide instructor id"});
    
        else {
    
            var decoded = req.decoded;
    
            let instructor_id = decoded.user_id;
    
            instruct.updateServiceAdded(instructor_id)
            .then((response)=>{
    
                if(!response.affectedRows) res.json({"status":false,"function":"addServices","message":"Database error"});
    
                else {
                       
                    return instruct.deleteExistingServices(instructor_id);
                }
            })
            .then((result)=>{

                each(JSON.parse(req.body.serviceIds), function(el, next) {
                    setTimeout(function () {
                        let addParam = {
                            instructor_id : instructor_id,
                            service_id : el
                        
                            
                        }
                        
                        functions.insert('service_plans', addParam);
                    next();
                    }, Math.random() * 5000);
                }, function (err) {
                    if(err == undefined){

                        res.json({"status":true,"function":"addServices","message":"Services updated"});

                   }else{
                       
                       res.json({"status":false,"function":"addServices","message":"Database error"});
                   }
                });
               
            })

            .catch((err)=>{
                console.log(err);
                res.json({"status":false,"function":"addServices","message":"Connection error"});
            })
        }
    },


    addPackages(req,res,next){

       
    
    
        if(!req.body.packages) res.json({"status":false,"function":"addPackages","message":"Please provide package"});
    
        else {
    
            let decoded = req.decoded;
    
            let instructor_id = decoded.user_id;
    
            let packageLength = JSON.parse(req.body.packages).length;
    
            let packages = JSON.parse(req.body.packages);
    
            if(packageLength > 0){
               
                instruct.updatePackageAdded(instructor_id)
                .then((result)=>{
    
                     if(!result.affectedRows) res.json({"status":false,"function":"addPackages","message":"Database error"});
    
                     else {
                       
                        return instruct.deleteExistingPackages(instructor_id);
    
                    }
                })
                .then((response)=>{
                      
                    return instruct.getAdminFee();

                })
                .then((admin)=>{

                    each(packages, function(el, next) {
                        setTimeout(function () {
                            let addParam = {
                                instructor_id : instructor_id,
                                num_of_lessons : el.num_of_lessons,
                                cost: parseInt(el.cost) + parseInt((((2.9/100) * el.cost) + .3)) + parseInt(((admin[0].value/100) * el.cost)),
                                instructor_cost: el.cost,
                                admin_cost: ((admin[0].value/100) * el.cost)
    
                            }
                            functions.insert('packages', addParam);
                          next();
                        }, Math.random() * 5000);
                    }, function (err) {
                        if(err == undefined){

                            res.json({"status":true,"function":"addPackages","message":"Packages added"});

                        }else{

                            res.json({"status":false,"function":"addPackages","message":"Database error"});

                        }
                    });

                })
                .catch((err)=>{
                    console.log(err);
                    res.json({"status":false,"function":"addPackages","message":"Connection error"});
                })
    
            }else{
    
                res.json({"status":false,"function":"addPackages","message":"Please provide at least one package"});
            }
    
            
        }
        
    },


    bookingList(req,res,next){

        var decoded = req.decoded;

        let instructor_id = decoded.user_id;

        let booking_count = '';

        if(!req.body.page) res.json({"status":false,"function":"bookingList","message":"Page is required"});

        else{

            let offset = ((req.body.page - 1) * 10) ;

            let limit = 10;

            instruct.getMyBookingCount(instructor_id,req.body.sortBy,req.body.filter,req.body.search)
            .then((count)=>{
                
                if(count.length){
                    booking_count = count[0].booking_count;
               }else{
                    booking_count = 0;
               }
               
                 
                return instruct.getMyBookings(instructor_id,req.body.sortBy,req.body.filter,req.body.search,offset,limit);
            })
            .then((response)=>{

                if(!response.length) res.json({"status":true,"function":"bookingList","data":[],"count":booking_count});

                else {

                    res.json({"status":true,"function":"bookingList","data":response,"count":booking_count});
                }
            })
            .catch((err)=>{
                res.json({"status":false,"function":"bookingList","error":err,"message":"Connection error"})
            })
        }
    },


    editProfile(req,res,next){

         var decoded = req.decoded;

         let instructor_id = decoded.user_id;

         let user_type = decoded.user_type;

         if(!req.body.first_name) res.json({"status":false,"function":"editProfile","message":"First name required"});

         else if(!req.body.last_name) res.json({"status":false,"function":"editProfile","message":"Last name required"});

        // else if(!req.body.dob) res.json({"status":false,"function":"editProfile","message":"Date of birth required"});

        // else if(!req.body.gender) res.json({"status":false,"functon":"editProfile","message":"Gender required"});

         else if(!req.body.image) res.json({"status":false,"function":"editProfile","message":"Profile image required"});

        // else if(!req.body.phone) res.json({"status":false,"function":"editProfile","message":"Phone is required"});

         else{

             let params = {

                first_name:req.body.first_name,
                last_name:req.body.last_name,
                image:req.body.image,
                phone:req.body.phone
             }

             if(req.body.dob != undefined && req.body.dob != ''){
                  params.dob = req.body.dob;
             }

             if(req.body.phone != undefined && req.body.phone != ''){
                params.phone = req.body.phone;
             }

             if(req.body.gender != undefined && req.body.gender != ''){
                 params.gender=req.body.gender
             }

             if(user_type == 2){
                 params.city = req.body.city;
                 params.state = req.body.state;
             }

             let age = Math.floor((new Date() - new Date(req.body.dob).getTime()) / 3.15576e+10);

             functions.update('user_master',params,{id:instructor_id})
             .then((result)=>{

                 if(!result.affectedRows) res.json({"status":false,"function":"editProfile","message":"Profile not updated"});

                 else{
                    
                    if(age == null){
                        params.age = '';
                    }else{
                        params.age = age;
                    }
                   

                    if(req.body.email){
                        params.email = req.body.email;
                    }

                    params.profile_image = params.image;

                    res.json({"status":true,"function":"editProfile","message":"Profile edited successfully","data":params});
                 }
             })
             .catch((err)=>{
                 console.log(err);
                 res.json({"status":false,"function":"editProfile","message":"Connection error"});
             })
         }

    },


    getInstructorDetails(req,res,next){
        
        var decoded = req.decoded;

        let instructor_id = decoded.user_id;

        instruct.getInstructorDetails(instructor_id)
        .then((result)=>{

            if(!result.length) res.json({"status":false,"function":"getInstructorDetails","message":"Database error"});

            else{
            
                res.json({"status":true,"function":"getInstructorDetails","data":result[0]});

            }
        })
        .catch((err)=>{
            console.log(err);
            res.json({"status":false,"function":"getInstructorDetails","message":"Connection error"});
        })
    },


    
    getPackages(req,res,next){

        let decoded = req.decoded;

        let instructor_id = decoded.user_id;
    
        instruct.getAllPackages(instructor_id)
       .then((response)=>{
           if(response.length > 0){
    
                res.json({"status":true,"function":"getPackages","message":"Packages fetched successfully","data":response});
          
            }else{
              
                res.json({"status":false,"function":"getPackages","message":"No Packages available"});
           }
       })
       .catch((err)=>{
           console.log(err);
           res.json({"status":false,"function":"getPackages","message":"Connection error"});
       })
    },
    getCertificates(req,res,next){
         
        let decoded = req.decoded;

        let instructor_id = decoded.user_id;

        instruct.getAllCertificates(instructor_id)
        .then((response)=>{

           if(response.length > 0){
    
                res.json({"status":true,"function":"getPackages","message":"Packages fetched successfully","data":response});
          
            }else{
              
                res.json({"status":false,"function":"getPackages","message":"No Packages available"});
           }
        })
        .catch((err)=>{
           console.log(err);
           res.json({"status":false,"function":"getPackages","message":"Connection error"});
        })

    },
    addLocation(req,res,next){

        let decoded = req.decoded;

        let instructor_id = decoded.user_id;

        if(!req.body.street_address) res.json({"status":false,"function":"addLocation","message":"Street address required"});

        else if(!req.body.city) res.json({"status":false,"function":"addLocation","message":"City is required"});

        else if(!req.body.state) res.json({"status":false,"function":"addLocation","message":"State is required"});

        else if(!req.body.zip_code) res.json({"status":false,"function":"addLocation","message":"Zipcode is required"});

        else if(!req.body.lat) res.json({"status":false,"function":"addLocation","message":"Latitude is required"});

        else if(!req.body.lng) res.json({"status":false,"function":"addLocation","message":"Longitude is required"});

        else {

            var param = {

                street_address : req.body.street_address,
                city : req.body.city,
                state : req.body.state,
                zip_code : req.body.zip_code,
                lat : req.body.lat,
                lng : req.body.lng
            }

            functions.update('user_master',param, {id:instructor_id})
            .then((result)=>{

                if(!result.affectedRows) res.json({"status":false,"function":"addLocation","message":"Database error"});

                else {

                    res.json({"status":true,"function":"addLocation","message":"Location updated successfully"});

                }
            })
        }
    },

    addBankAccount(req,res,next){

        let decoded = req.decoded;

        let user_id = decoded.user_id;

        let data = {};

        let userDet = {};

        functions.get('user_master',{id:user_id})
        .then((result)=>{

            if(!result.length) res.json({"status":false," function":"addBankAccount","message":"Database error"});

            else{


                

                userDet = {

                    first_name: result[0].first_name,
                    last_name: result[0].last_name,
                    email: result[0].email

                }

                return stripe.createAccountToken(userDet,req.body);

                
            }
        })
        .then((account_token)=>{

             if(!account_token.id) res.json({"status":false,"function":"addBankAccount","message":"Account token not generated"});


            else return stripe.createAccount(userDet,req.body,account_token.id);

        })
        .then((stripeAccount)=>{

            if(!stripeAccount.id) res.json({"status":false,"function":"addBankAccount","messages":"Bank account not created"});

            else {
               

                data = {

                    bank_name: req.body.bank_name,
                    account_4_digit: req.body.account_number.substr(req.body.account_number.length - 4)
                }


                return functions.update('user_master',{bank_account:stripeAccount.id,bank_name:req.body.bank_name,account_4_digit:data.account_4_digit},{id:user_id});
            }
        })
        .then((updated)=>{
            
           
            if(!updated.affectedRows) res.json({"status":false,"function":"addBankAccount","message":"Database error"});

            else{

                res.json({"status":true,"function":"addBankAccount","message":"Bank account added successfully","data":data});
            }
        })
        .catch((err)=>{
            console.log("reererererere",err);
           
            res.json({"status":false,"function":"addBankAccount","error":err,"message":"Connection error"});
        })
    },

    getBankAccount(req,res,next){
      
         let decoded = req.decoded;

         let user_id = decoded.user_id;

         instruct.getAccountDet(user_id)
         .then((result)=>{

              if(!result.length) res.json({"status":false,"function":"getBankAccount","message":"No bank account"});

              else {

                if(result[0].bank_name != ''){
                   
                    res.json({"status":true,"function":"getBankAccount",data:result[0]});
                
                }else{

                    res.json({"status":false,"function":"getBankAccount","message":"Bank Account not created"});
                }

              }
         })
    },

    cancelBooking(req,res,next){

        if(!req.body.booking_id) res.json({"status":false,"function":"cancelBooking","message":"Bookng id required"});

        else{

            instruct.getTransactionId(req.body.booking_id)
            .then((result)=>{

                if(!result.length) res.json({"status":false,"function":"cancelBooking","message":"No transaction done against this booking"});

                else return stripe.refundAmount(result[0].transaction_id, true);
            })
            .then((response)=>{

                if(!response) res.json({"status":false,"function":"cancelBooking","message":"Stripe error"});

                else {

                  

                       let updates = {
    
                            refund_id : response.id,
                            status : 'Cancelled',
                            cancelled_by : 'instructor'
                        }
                  


                    return functions.update('bookings',updates,{booking_id:req.body.booking_id});
                }
            })
            .then((updated)=>{

                if(!updated.affectedRows) res.json({"status":false,"function":"cancelBooking","message":"Database error"});

                else return functions.update('payment_reports',{status:'cancelled'},{booking_id:req.body.booking_id});
               
            })
            .then((payment)=>{
               
                if(!payment.affectedRows) res.json({"status":false,"function":"cancelBooking","message":"Database error"});

                else res.json({"status":true,"function":"cancelBooking","message":"Booking cancelled"});

            })
            .catch((err)=>{

                console.log(err);
                res.json({"status":false,"function":"cancelBooking","message":"Connection error"});
            })
        }
    },

    acceptBooking(req,res,next){

        if(!req.body.booking_id) res.json({"status":false,"function":"acceptBooking","message":"Bookng id required"});

        else {

            let stripeFees = {};

            let paymentDet = {};

            instruct.getBookingCost(req.body.booking_id)
            .then((bookingDet)=>{
                if(!bookingDet.length) res.json({"status":false,"function":"acceptBooking","message":"Database error"});

                else{


                    paymentDet = {

                        amount: bookingDet[0].instructor_cost,
                        instructor_id: bookingDet[0].instructor_id,
                        user_id: bookingDet[0].user_id,
                        package_id: bookingDet[0].package_id,
                        status:'accepted',
                        booking_id: req.body.booking_id,
                        created_at: moment().format('YYYY-MM-DD HH:mm:ss')
                    }
                    
                    stripeFees = {

                        cost : bookingDet[0].cost * 100,
                        admin_cost : bookingDet[0].admin_cost * 100,
                        instructor_cost : bookingDet[0].instructor_cost * 100,
                        card_token : bookingDet[0].card_token,
                        bank_account : bookingDet[0].bank_account,
                        customer_id: bookingDet[0].stripe_id
    
                    }
                
                    return stripe.payAmount(stripeFees);
                } 
                    
                
            })
            .then((paid)=>{

                if(!paid.id) res.json({"status":false,"function":"acceptBooking","message":"Stripe error, payment failed"});

                else{

                    let bookingDetail = {
                        status : 'Accepted',
                        transaction_id : paid.id
                    }

                    return functions.update('bookings',bookingDetail,{booking_id:req.body.booking_id});
                }
            })

            .then((result)=>{

                if(!result.affectedRows) res.json({"status":false," function":"acceptBooking","message":"Database error"});

                else return functions.insert('payment_reports',paymentDet);
            })
            .then((response)=>{

                if(!response.insertId) res.json({"status":false," function":"acceptBooking","message":"Database error"});

                else res.json({"status":true,"function":"acceptBooking","message":"Booking accepted"});
            })
            .catch((err)=>{
 
                console.log(err);
                res.json({"status":false,"function":"acceptBooking","message":"Connection error"});
            })
        }
    },

    rejectBooking(req,res,next){

          if(!req.body.booking_id) res.json({"status":false,"function":"rejectBooking","message":"Booking id required"});

           else {

                let bookingDetail = {
                    status : 'Rejected',
                   
                }

                 functions.update('bookings',bookingDetail,{booking_id:req.body.booking_id})
                 .then((result)=>{

                    if(!result.affectedRows) res.json({"status":false," function":"rejectBooking","message":"Database error"});
    
                    else res.json({"status":true," function":"rejectBooking","message":"Booking rejected"});

                 })
          
          }
    },

    paymentReport(req,res,next){

        let decoded = req.decoded;

        let instructor_id = decoded.user_id;

        let periodicPayment = {};

        instruct.getPaymentLastYear(instructor_id)
        .then((result)=>{

            if(!result.length) res.json({"status":false,"function":"paymentReport","message":"Database error"});

            else {

                periodicPayment.yearly = result[0].yearly_payment;

                return instruct.getPaymentThisMonth(instructor_id);
            }
        })
        .then((response)=>{
           
            if(!response.length) res.json({"status":false,"function":"paymentReport","message":"Database error"});

            else {
               
                periodicPayment.monthly = response[0].monthly_payment;

                return instruct.getPaymentThisWeek(instructor_id);
            }

            
        })
        .then((week)=>{
          
            if(!week.length) res.json({"status":false,"function":"paymentReport","message":"Database error"});

            else {
               
                periodicPayment.weekly = week[0].weekly_payment;

                return instruct.getPaymentLastTen(instructor_id);
            }

        })
        .then((lastTen)=>{

            if(!lastTen.length) res.json({"status":false,"function":"paymentReport","message":"Database error"});

            else {
                
                periodicPayment.last_ten = lastTen[0].last_ten;

                return instruct.getPaymentWhole(instructor_id);
            }
        })
        .then((wholeTime)=>{
            
            if(!wholeTime.length) res.json({"status":false,"function":"paymentReport","message":"Database error"});

            else {
                
                periodicPayment.wholeTime = wholeTime[0].wholeTime;

                return instruct.getAllPayment(instructor_id);
            }

        })
        .then((paylist)=>{

            let data = {
                periodicPayment: periodicPayment,
                paymentList: paylist
            }
             
            res.json({"status":true,"function":"paymentReport","data":data});
            
        })
        .catch((err)=>{
             console.log(err);
            res.json({"status":false,"function":"paymentReport","message":"Connection error"});
        })


    },
    deleteBankAccount(req,res,next){

        let decoded = req.decoded;

        let instructor_id = decoded.user_id;

        instruct.getBankAccount(instructor_id)
        .then((account)=>{

            if(!account.length) res.json({"status":false, "function":"deleteBankAccount","message":"Database error"});

            else if(account[0].bank_account == '') res.json({"status":false,"function":"deleteBankAccount","message":"This instructor doesnot have a bank account"});

            else {

                return stripe.deleteAccount(account[0].bank_account);
            }

        })
        .then((deleted)=>{

            if(deleted.deleted != true) res.json({"status":false,"function":"deleteBankAccount","message":"Account not deleted"});

            else return instruct.deleteBankDet(instructor_id);
        })
        .then((updated)=>{

            if(updated.affectedRows > 0) res.json({"status":true,"function":"deleteBankAccount","message":"Bank Account Deleted"});

            else res.json({"status":false,"function":"deleteBankAccount","message":"Database error"});

        })
        .catch((err)=>{

            console.log("Error", err);
            res.json({"status":false,"function":"deleteBankAccount","message":"Connection error","error":err});
        })

    }
    

}
module.exports = instructorHandler;