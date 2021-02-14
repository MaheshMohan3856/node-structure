let express = require('express'),
jwt = require('jsonwebtoken'),
moment = require('moment'),
functions = require('../helpers/functions'),
randomstring = require('randomstring'),
randToken = require('rand-token'),
fs = require('fs'),
config = require('../server/config'),
dateformat = require('dateformat'),
auth = require('../dao/authDao'),
emailValidator = require('email-validator'),
stripeLib = require('../helpers/stripeLib'),
each = require('async-each-series'),
app = express();

let authHandler = {

   login(req,res,next){

    let loginDet = {};

    let param = {};
    
    let new_otp = '';


    if (!req.body.email) res.json({ "status": false, "function": "login", "message": "Email is required.", "errorcode": "validationError" });

    else if (!req.body.password) res.json({ "status": false, "function": "login", "message": "Password is required.", "errorcode": "validationError" });
     
    else {
        auth.getUserByEmail(req.body.email)
            .then((result) => {

                let password = '';

                if (!result.length) res.json({ "status": false, "function": "login", "message": "User does not exist", "errorcode": "validationError" });

                    password = functions.decryptPass(result[0].password);

                if (password != req.body.password) res.json({ "status": false, "function": "login", "message": "Incorrect Password", "errorcode": "validationError" });

                else if (result[0].user_type != req.body.user_type) res.json({ "status": false, "function": "login", "message": "This user doesnot exist.", "errorcode": "validationError" });
       
                

                else {

                    param = {
                        user_id:result[0].user_id,
                        email:result[0].email,
                        user_type:result[0].user_type
                    }

                    loginDet = result[0];

                    new_otp = randomstring.generate({
                        length: 4,
                        charset: 'numeric'
                      });
                   
                    if(result[0].active == 'Y'){


                        let token = jwt.sign(param, config.secret, {
                            expiresIn: 10000 
                        });
    
                        let refreshToken = randToken.uid(256);
    
                        functions.createRefreshTokenJsonFile(loginDet, refreshToken);
    
                        res.setHeader("RefreshToken", refreshToken);
    
                        res.setHeader("AuthToken", token);
    
        
                        delete loginDet['password'];

                        if(req.body.user_type == 3){

                            if(result[0].certificate_added == 'Y' && result[0].service_added == 'Y' && result[0].package_added == 'Y' && result[0].active == 'Y'){

                                    if(result[0].admin_approved == 'N') res.json({ "status": false, "function": "login", "message": "Your account verification is in progress. Please wait for admin confirmation."});

                                    else res.json({ "status": true, "function": "login", "message": "Logged in successfully.", "data": loginDet });
                            }else{
                                 
                                res.json({ "status": true, "function": "login", "message": "Logged in successfully.", "data": loginDet });

                            }

                        }else{

                            res.json({ "status": true, "function": "login", "message": "Logged in successfully.", "data": loginDet });

                        }

   
                    }else{

                        
                        return  auth.updateEmailOtp(new_otp,req.body.email);
                        

                    }


                }

            })
            .then((updated)=>{

                if(updated != undefined & updated.affectedRows > 0) {
                                                                     
                    if(param.user_type == 2){

                        return auth.getTemplate('user_resend_code');
    
                     }else{
                       
                        return auth.getTemplate('instructor_resend_code');
                        
                     }
                }
                

            })
            
            .then((email_template)=>{
                   
                let email_content = email_template[0].email_template;

                let replaceDate  = {
                    '##NAME##': loginDet.first_name,
                    '##OTP##': new_otp
                }

               return functions._send(param.email, email_template[0].email_subject, email_content,replaceDate)
            })
            .then((email_send)=>{

                
                let token = jwt.sign(param, config.secret, {
                    expiresIn: 3600 * 24
                });

                let refreshToken = randToken.uid(256);

                functions.createRefreshTokenJsonFile(loginDet, refreshToken);

                res.setHeader("RefreshToken", refreshToken);

                res.setHeader("AuthToken", token);

   
                delete loginDet['password'];

                

                  res.json({ "status": true, "function": "login", "message": "Logged in successfully.", "data": loginDet });

               
                 
           })
            .catch((err) => {
                console.log(err);
                res.json({ "status": false, "function": "login", error: err, "message": "Connection error", "errorcode": "serverError" });
            })
    }
 },

 config(req,res,next){

     functions.getConfigData()
     
     .then((conf)=>{

         res.json({"status":true,"config":conf});

     })

 },

 register(req, res, next) {

    if (!req.body.first_name) res.json({ "status": false, "function": "register", "message": "First name is required", "errorcode": "validationError" });

    else if (!req.body.last_name) res.json({ "status": false, "function": "register", "message": "Last name is required", "errorcode": "validationError" });

    else if (!req.body.email) res.json({ "status": false, "function": "register", "message": "Email is required", "errorcode": "validationError" });

    else if (!emailValidator.validate(req.body.email)) res.json({ "status": false, "function": "register", "message": "Invalid email", "errorcode": "validationError" });

    else if (!req.body.password) res.json({ "status": false, "function": "register", "message": "Password is required", "errorcode": "validationError" });

    //else if (!req.body.phone) res.json({ "status": "false", "function": "register", "message": "Phone is required", "errorcode": "validationError" });

    else {

        let userDetails = {}, token, refreshToken;

        userDetails.first_name = req.body.first_name;

        userDetails.last_name = req.body.last_name;

        userDetails.email = req.body.email;

        userDetails.password = functions.encryptPass(req.body.password);

        userDetails.user_type = req.body.user_type;

        userDetails.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

        userDetails.active = 'N';

        userDetails.image = config.site_url + 'users/noimage.jpg';

        userDetails.otp = randomstring.generate({
            length: 4,
            charset: 'numeric'
          });

        auth.getUserByEmail(req.body.email)
            .then((user_details) => {

                if (user_details.length) res.json({ "status": false, "function": "register", "message": "Email already exists." });

                else return stripeLib.createCustomer(userDetails.email);

             //   else return functions.insert('user_master', userDetails);
            
            })
            .then((stripe)=>{

                if(!stripe.id) res.json({"status":false,"function":"register","message":"Stripe account not created"});
            
                else{

                    userDetails.stripe_id = stripe.id;
                    
                    return functions.insert('user_master', userDetails);

                } 

            })

            .then((result) => {

               

                if (!result.insertId) throw 'Database error';

                else {

                    userDetails.user_id = result.insertId;

                    userDetails.profile_image = config.site_url + 'users/noimage.jpg';

                    userDetails.certificate_added = 'N';

                    userDetails.package_added = 'N';

                    userDetails.service_added = 'N';

                    userDetails.phone = '';

                    userDetails.age = '';

                    userDetails.gender = '';

                    userDetails.dob = '';

                    userDetails.admin_approved = 'N';

                    if(userDetails.user_type == 3){
                
                        return auth.getTemplate('registration_instructor');

                    }else{
                        
                        return auth.getTemplate('registration_user');
                    }

                }

            })
            .then((email_template)=>{


                let email_content = email_template[0].email_template;

                let replaceDate  = {
                    '##FIRST_NAME##': userDetails.first_name,
                    '##OTP##': userDetails.otp
                }

                return functions._send(userDetails.email, email_template[0].email_subject, email_content,replaceDate);

            })

            .then((email_response) => {

              

                if (email_response.status != "success") res.json({ "status": false, "function": "register", "message": "Email Id Invalid" });
                

                else {

                    let param = {
                        user_id:userDetails.user_id,
                        email:userDetails.email,
                        user_type:userDetails.user_type
                    }

                    token = jwt.sign(param, config.secret, {
                        expiresIn: 3600 * 24 
                    });

                    refreshToken = randToken.uid(256);

                    functions.createRefreshTokenJsonFile(userDetails, refreshToken);

                    

                    res.setHeader("RefreshToken", refreshToken);

                    res.setHeader("AuthToken", token);

                    delete userDetails['password'];

                    if(userDetails.user_type == 3){
                         
                        return auth.getTemplateWithAdminEmail('admin_inform');

                    }else{

                        res.json({ "status": true, "function": "register", "message": "Successfully Registered", "data": userDetails });
                    }


                }


            })
            .then((adminMail)=>{

                let replaceDate = {};

                functions._send(adminMail[0].admin_email, adminMail[0].email_subject, adminMail[0].email_template,replaceDate);

                res.json({ "status": true, "function": "register", "message": "Successfully Registered", "data": userDetails });
            })

            .catch((err) => {
                console.log(err);
                res.json({ "status": false, "function": "register", error: err, "message": "Connection error", "errorcode": "serverError" });
            })



    }


},


fbLogin(req,res,next){
  

    if (!req.body.first_name) res.json({ "status": false, "function": "fbLogin", "message": "First name is required", "errorcode": "validationError" });

    else if (!req.body.last_name) res.json({ "status": false, "function": "fbLogin", "message": "Last name is required", "errorcode": "validationError" });

    else if (!req.body.email) res.json({ "status": false, "function": "register", "fbLogin": "Email is required", "errorcode": "validationError" });

    else if (!emailValidator.validate(req.body.email)) res.json({ "status": false, "function": "fbLogin", "message": "Invalid email", "errorcode": "validationError" });

    else if (!req.body.facebook_id) res.json({ "status": false, "function": "fbLogin", "message": "Password is required", "errorcode": "validationError" });

    //else if (!req.body.phone) res.json({ "status": "false", "function": "register", "message": "Phone is required", "errorcode": "validationError" });

    else {

        let userDetails = {}, token, refreshToken;

        userDetails.first_name = req.body.first_name;

        userDetails.last_name = req.body.last_name;

        userDetails.email = req.body.email;

        userDetails.facebook_id = req.body.facebook_id;

        userDetails.user_type = req.body.user_type;

        userDetails.image = (req.body.profile_image != '')?req.body.profile_image:config.site_url + 'users/noimage.jpg';

        userDetails.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

        userDetails.active = 'Y';

        

            auth.getUserByEmail(req.body.email)
            .then((user_details) => {

                if (user_details.length){

                    if(user_details[0].facebook_id != req.body.facebook_id) res.json({ "status": false, "function": "fbLogin", "message": "This email has been already registered through other means."});

                                       
                    else {

                           var userDet  = user_details[0];
                    
                            let param = {
                                user_id : userDet.user_id,
                                email : userDet.email,
                                user_type : userDet.user_type
                            }

                            token = jwt.sign(param, config.secret, {
                                expiresIn: 3600 * 24
                            });


                            refreshToken = randToken.uid(256);

                            functions.createRefreshTokenJsonFile(userDet, refreshToken);

                            

                            res.setHeader("RefreshToken", refreshToken);

                            res.setHeader("AuthToken", token);

                                            
                            

                            delete userDet['password'];

                            if(userDetails.user_type == 3){

                                if(user_details[0].certificate_added == 'Y' && user_details[0].service_added == 'Y' && user_details[0].package_added == 'Y' && user_details[0].active == 'Y'){

                                    if(user_details[0].admin_approved == 'N') res.json({ "status": false, "function": "fbLogin", "message": "Your account verification is in progress. Please wait for admin confirmation."});
                
                                    else res.json({ "status": true, "function": "fbLogin", "message": "Logged in successfully.", "data": userDet });

                                }else{

                                    res.json({ "status": true, "function": "fbLogin", "message": "Logged in successfully.", "data": userDet });
                                }
            
                            }else{
            
                                res.json({ "status": true, "function": "fbLogin", "message": "Logged in successfully.", "data": userDet });
            
                            }
                            

                    }
                       

                } 

                else return stripeLib.createCustomer(userDetails.email);

                //   else return functions.insert('user_master', userDetails);
               
            })
            .then((stripe)=>{
   
                   if(!stripe.id) res.json({"status":false,"function":"fbLogin","message":"Stripe account not created"});
               
                   else{
   
                       userDetails.stripe_id = stripe.id;
                       
                       return functions.insert('user_master', userDetails);
   
                   } 
   
              
            })

            .then((result) => {

                if (!result.insertId) res.json({ "status": false, "function": "fbLogin", "message": "Database error" });

                else {

                    userDetails.user_id = result.insertId;

                    let param = {
                        user_id:userDetails.user_id,
                        email:userDetails.email,
                        user_type:userDetails.user_type
                    }

                    token = jwt.sign(param, config.secret, {
                        expiresIn: 3600 * 24
                    });

                    refreshToken = randToken.uid(256);

                    functions.createRefreshTokenJsonFile(userDetails, refreshToken);

                    res.setHeader("RefreshToken", refreshToken);

                    res.setHeader("AuthToken", token);

                    userDetails.profile_image = config.site_url + 'users/noimage.jpg';

                    userDetails.certificate_added = 'N';

                    userDetails.package_added = 'N';

                    userDetails.service_added = 'N';

                   userDetails.age = '';

                   userDetails.phone = '';

                   userDetails.gender = '';

                   userDetails.dob = '';

                   userDetails.admin_approved = 'N';

                  

                   if(userDetails.user_type == 3){
                         
                    return auth.getTemplateWithAdminEmail('admin_inform');

                }else{

                    res.json({ "status": true, "function": "fbLogin", "message": "Successfully Registered", "data": userDetails });
                }


            }


        })
        .then((adminMail)=>{

            let replaceDate = {};

            functions._send(adminMail[0].admin_email, adminMail[0].email_subject, adminMail[0].email_template,replaceDate);

            res.json({ "status": true, "function": "fbLogin", "message": "Successfully Registered", "data": userDetails });
        })


           

        .catch((err) => {
            console.log(err);
            res.json({ "status": false, "function": "fbLogin", error: err, "message": "Connection error", "errorcode": "serverError" });
        })



    }

},

verifyOtp(req,res,next){

    if(!req.body.otp) res.json({"status":false,"function":"verifyOtp","message": "Otp is required", "errorcode": "validationError"});

    else if(!req.body.email) res.json({"status":false,"function":"verifyOtp","message":"Email is required","errorcode": "validationError"});

    else if(!req.body.activeFunction) res.json({"status":false,"function":"verifyOtp","message": "Specify the page", "errorcode": "validationError"});

    else {

        if(req.body.activeFunction == '0'){
            
            auth.getOtpDetail(req.body.email)
            .then((response)=>{

                    if(response[0].otp != req.body.otp) res.json({"status":false,"function":"verifyOtp","message":"Incorrect verification code"});

                    else {   
                        
                        return auth.updateUserActive(req.body.email);
                        
    
                    }
                
            })
            .then((activated)=>{

                if(activated.affectedRows == 0) res.json({"status":false,"function":"verifyOtp","message":"Database error."});

                else {

                    res.json({"status":true,"function":"verifyOtp","message":"Verification code verified"});
                }
            })
            .catch((err)=>{
                 console.log(err);
                res.json({"status":false,"function":"verifyOtp","message":"Server error"});

            })

        } else {
             
            auth.getOtpDetail(req.body.email)
            .then((response)=>{

                    if(response[0].fp_otp != req.body.otp) res.json({"status":false,"function":"verifyOtp","message":"Incorrect verification code"});

                    else {   
                        
                        res.json({"status":true,"function":"verifyOtp","message":"OTP Verified"});
                        
    
                    }
                
            })
            .catch((err)=>{
                console.log(err);
               res.json({"status":false,"function":"verifyOtp","message":"Connection error"});

            })

        } 

        
    }
},

sendOtp(req,res,next){

    if(!req.body.email) res.json({"status":false,"function":"sendOtp","message":"Email is required"});

    else { 

        let otp = randomstring.generate({
            length: 4,
            charset: 'numeric'
          });

        let userDetails = {};

        let user_type = '';

        if(req.body.activeFunction == '1'){

            auth.getOtpDetail(req.body.email)
            .then((result)=>{

                if(!result.length) res.json({"status":false,"function":"sendOtp","message":"This email is not registered with Honu"});

                else {

                    
                    return  auth.updateForgotOtp(otp,req.body.email)

                }

            })
            .then((resp)=>{

                if(!resp.affectedRows) res.json({"status":false,"function":"sendOtp","message":"Database error"});
                

                else {

                    return auth.getOtpDetail(req.body.email)
                }
            })
            
            .then((userDet)=>{

                if(!userDet.length) res.json({"status":false,"function":"sendOtp","message":"Database error"});

                else {

                    userDetails.first_name = userDet[0].first_name;

                    userDetails.last_name = userDet[0].last_name;

                    userDetails.otp = userDet[0].fp_otp;
                    
                    return  auth.getTemplate('forgot_password');

                

                }

            })
            .then((email_template)=>{


                let email_content = email_template[0].email_template;

                let replaceDate  = {
                    '##NAME##': userDetails.first_name,
                    '##OTP##': userDetails.otp
                }

                return functions._send(req.body.email, email_template[0].email_subject, email_content,replaceDate);

            })

            .then((email_response) => {

            

                if (email_response.status != "success") res.json({ "status": false, "function": "sendOtp", "message": "Email Id Invalid" });

                else {
                    
                    res.json({ "status": true, "function": "sendOtp", "message": "Code send to email" });
                }
            })
            .catch((err)=>{
                console.log(err);
                res.json({"status":false,"function":"sendOtp","error":err,"message":"Connection error"});
            })

        }else{

            auth.getOtpDetail(req.body.email)
            .then((result)=>{

                if(!result.length) res.json({"status":false,"function":"sendOtp","message":"This email not registered with Honu"});

                else {

                    user_type = result[0].user_type;
                    
                    return  auth.updateEmailOtp(otp,req.body.email)

                }

            })
            .then((resp)=>{

                if(!resp.affectedRows) res.json({"status":false,"function":"sendOtp","message":"Database error"});
                

                else {

                    return auth.getOtpDetail(req.body.email)
                }
            })
            
            .then((userDet)=>{

                if(!userDet.length) res.json({"status":false,"function":"sendOtp","message":"Database error"});

                else {

                    userDetails.first_name = userDet[0].first_name;

                    userDetails.last_name = userDet[0].last_name;

                    userDetails.otp = userDet[0].otp;

                    if(user_type == 2){

                        return  auth.getTemplate('user_resend_code');

                    }else{

                        return  auth.getTemplate('instructor_resend_code');
                    }
                    
 
                }

            })
            .then((email_template)=>{


                let email_content = email_template[0].email_template;

                let replaceDate  = {
                    '##NAME##': userDetails.first_name,
                    '##OTP##': userDetails.otp
                }

                return functions._send(req.body.email, email_template[0].email_subject, email_content,replaceDate);

            })

            .then((email_response) => {

            

                if (email_response.status != "success") res.json({ "status": false, "function": "sendOtp", "message": "Email Id Invalid" });

                else {
                    
                    res.json({ "status": true, "function": "sendOtp", "message": "Code send to email" });
                }
            })
            .catch((err)=>{
                console.log(err);
                res.json({"status":false,"function":"sendOtp","error":err,"message":"Connection error"});
            })
        }
        
    }
},
changePassword(req,res,next){

    var decoded = req.decoded;

    let instructor_id = decoded.user_id;

    if(!req.body.curPassword) res.json({"status":false,"function":"changePassword","message":"Current password required"});

    if(!req.body.newPassword) res.json({"status":false,"function":"changePassword","message":"New password required"});

    else{

        let password = functions.encryptPass(req.body.curPassword);

        let newPassword = functions.encryptPass(req.body.newPassword);

        functions.get('user_master',{id : instructor_id})
        .then((result)=>{

            if(!result.length) res.json({"status":false,"function":"changePassword","message":"User doesnot exist"});

            else{

               
                if(result[0].password != password) res.json({"status":false,"function":"changePassword","message":"Current password is incorrect"});

                else {

                    return functions.update('user_master',{password:newPassword},{id:instructor_id});
                }
            }
        })
        .then((response)=>{

            if(!response.affectedRows) res.json({"status":false,"function":"changePassword","message":"Database error"});

            else res.json({"status":true,"function":"changePassword","message":"Password updated"});
        })
        .catch((err)=>{
            console.log(err);
            res.json({"status":false,"function":"changePassword","message":"Connection error"});
        })


    }
},

resetPassword(req,res,next){

    if(!req.body.email) res.json({"status":false,"function":"resetPassword","message":"Email is required"});

    if(!req.body.password) res.json({"status":false,"function":"resetPassword","message":"New password required"});

    else{

        let password = functions.encryptPass(req.body.password);

        functions.get('user_master',{email : req.body.email})
        .then((result)=>{

            if(!result.length) res.json({"status":false,"function":"resetPassword","message":"User doesnot exist"});

            else{

                    return functions.update('user_master',{password:password},{email : req.body.email});
               
            }
        })
        .then((response)=>{

            if(!response.affectedRows) res.json({"status":false,"function":"resetPassword","message":"Database error"});

            else res.json({"status":true,"function":"resetPassword","message":"Password updated"});
        })
        .catch((err)=>{
            console.log(err);
            res.json({"status":false,"function":"resetPassword","message":"Connection error"});
        })


    }
}


}

module.exports = authHandler;