let express = require('express'),
    app = express(),
    jwt = require('jsonwebtoken'),
    moment = require('moment'),
    randToken = require('rand-token'),
    jsonfile = require('jsonfile'),
    randomstring = require('randomstring'),
    fs = require('fs'),
    config = require('../server/config'),
    user = require('../dao/userDao'),
    functions = require('../helpers/functions'),
    emailValidator = require('email-validator'),
    stripe = require('../helpers/stripeLib'),
    dateformat = require('dateformat');

let handler = {
    index(req, res, next) {
        res.send('respond with a resource');
    },
    login(req, res, next) {

        let loginDet = {}, driveDet = {};

        if (!req.body.email) res.status(403).json({ "status": "false", "function": "login", "message": "Email is required.", "errorcode": "validationError" });

        else if (!req.body.password) res.status(403).json({ "status": "false", "function": "login", "message": "Password is required.", "errorcode": "validationError" });

        else {
            user.getUserByEmail(req.body.email)
                .then((result) => {

                    let password = '';

                    if (!result.length) res.status(403).json({ "status": "false", "function": "login", "message": "User does not exist", "errorcode": "validationError" });


                    password = functions.decryptPass(result[0].password);

                    if (password != req.body.password) res.status(403).json({ "status": "false", "function": "login", "message": "Incorrect Password", "errorcode": "validationError" });

                    else if (result[0].is_blocked == 'Y') res.status(403).json({ "status": "false", "function": "login", "message": "Your account has been blocked. Please contact admin.", "errorcode": "validationError" });



                    else {

                        let token = jwt.sign(result[0], config.secret, {
                            expiresIn: 3600
                        });

                        let refreshToken = randToken.uid(256);

                        functions.createRefreshTokenJsonFile(result[0], refreshToken);

                        res.setHeader("RefreshToken", refreshToken);

                        res.setHeader("AuthToken", token);

                        loginDet.four_digit = result[0].last_4_digit;

                        result[0].profile_image = config.site_url + 'users/' + result[0].user_id + '/' + result[0].profile_image;

                        loginDet = result[0];

                        return user.getDriverDetails(result[0].user_id)

                    }

                })
                .then((drive) => {

                    driveDet = drive[0];

                    return user.getLastFewTrips(loginDet.user_id)
                })
                .then((response) => {

                    loginDet.driveDet = driveDet;

                    loginDet.trips = response;

                    return config.getConfig();

                })
                .then((conf) => {

                    loginDet.allowableTimeDifference = conf.delTimeDiff[0];

                    loginDet.allowableTolerence = conf.onRouteTolerence[0];

                    loginDet.maximumAccetableDistance = conf.accptRadius[0];

                    res.json({ "status": "true", "function": "login", "message": "Logged in successfully.", "userdetails": loginDet });
                })
                .catch((err) => {
                    console.log(err);
                    res.json({ "status": "false", "function": "login", error: err, "message": "Connection error", "errorcode": "serverError" });
                })
        }
    },
    register(req, res, next) {

        if (!req.body.first_name) res.json({ "status": "false", "function": "register", "message": "First name is required", "errorcode": "validationError" });

        else if (!req.body.last_name) res.json({ "status": "false", "function": "register", "message": "Last name is required", "errorcode": "validationError" });

        else if (!req.body.email) res.json({ "status": "false", "function": "register", "message": "Email is required", "errorcode": "validationError" });

        else if (!emailValidator.validate(req.body.email)) res.json({ "status": "register", "function": "login", "message": "Invalid email", "errorcode": "validationError" });

        else if (!req.body.password) res.json({ "status": "false", "function": "register", "message": "Password is required", "errorcode": "validationError" });

        else if (!req.body.phone) res.json({ "status": "false", "function": "register", "message": "Phone is required", "errorcode": "validationError" });

        else {

            let userDetails = {}, token, refreshToken;

            userDetails.first_name = req.body.first_name;

            userDetails.last_name = req.body.last_name;

            userDetails.email = req.body.email;

            userDetails.mobile = req.body.phone;

            userDetails.profile_image = req.file.filename;

            userDetails.password = functions.encryptPass(req.body.password);

            userDetails.type_id = 2;

            userDetails.created_date = moment().format('YYYY-MM-DD HH:mm:ss');

            userDetails.modified_date = moment().format('YYYY-MM-DD HH:mm:ss');

            userDetails.sms_code = randomstring.generate({ length: 10, charset: 'alphanumeric' });

            userDetails.block = 'N';

            functions.get('user_master', { email: userDetails.email })
                .then((user_details) => {

                    if (user_details.length) res.json({ "status": "false", "function": "register", "message": "Email already exists." });

                    else return functions.insert('user_master', userDetails);

                })

                .then((result) => {

                    if (!result.insertId) throw 'Database error';

                    else {

                        userDetails.user_id = result.insertId;

                        let email_content = `
                                        <p>Hi ${userDetails.first_name} ${userDetails.last_name},</p>
                                        <p>You have successfully registered with Puador. Have a good time with Delivery at your Door Step.</p>
                                    `;

                        return functions._send(userDetails.email, "Puador Registration Mail", email_content);

                    }

                })

                .then((email_response) => {

                    if (email_response.status != "success") res.json({ "status": "false", "function": "register", "message": "Email Id Invalid" });

                    else {

                        token = jwt.sign(userDetails, config.secret, {
                            expiresIn: 3600
                        });

                        refreshToken = randToken.uid(256);

                        functions.createRefreshTokenJsonFile(userDetails, refreshToken);

                        let tempPath = config.upload_url + 'users/temp/' + userDetails.profile_image,

                            newPath = config.upload_url + 'users/' + userDetails.user_id + '/' + userDetails.profile_image;

                        fs.renameSync(tempPath, newPath);

                        res.setHeader("RefreshToken", refreshToken);

                        res.setHeader("AuthToken", token);

                        userDetails.profile_image = config.site_url + 'users/' + userDetails.user_id + '/' + userDetails.profile_image;

                        userDetails.trips = [];

                        userDetails.driver_rating = 0;

                        userDetails.requester_rating = 0;

                        userDetails.four_digit = "<null>";

                        return config.getConfig();

                    }


                }).then((conf) => {

                    userDetails.allowableTimeDifference = conf.delTimeDiff[0];

                    userDetails.allowableTolerence = conf.onRouteTolerence[0];

                    userDetails.maximumAccetableDistance = conf.accptRadius[0];

                    res.json({ "status": "true", "function": "register", "message": "You have been successfully registered.", "userdetails": userDetails });

                })

                .catch((err) => {
                    console.log(err);
                    res.json({ "status": "false", "function": "register", error: err, "message": "Connection error", "errorcode": "serverError" });
                })



        }


    },
    
    driverProfile(req, res, next) {
        if (!req.body.user_id) res.json({ "status": "false", "function": "driverProfile", "message": "User Identification required", "errorcode": "validationError" });
        else {

            let driverDet = {}, acctDet = {};

            acctDet.account_number = req.body.account_number;

            acctDet.routing_number = req.body.routing_number;

            acctDet.ssn_number = req.body.ssn_number;

            acctDet.account_holder = req.body.account_holder;

            console.log(req.body.dob);

            let check = dateformat(req.body.dob, 'yyyy/mm/dd');

            console.log(check);

            acctDet.month = dateformat(check, 'mm');

            acctDet.day = dateformat(check, 'dd');

            acctDet.year = dateformat(check, 'yyyy');

            acctDet.address = req.body.address;

            acctDet.city = req.body.city;

            acctDet.state = req.body.state;

            acctDet.zip = req.body.zipcode;

            driverDet.user_id = req.body.user_id;

            driverDet.license_no = req.body.license_no;

            driverDet.license_expiry = dateformat(req.body.license_expiry, 'yyyy-mm-dd');

            driverDet.reg_no = req.body.reg_no;

            driverDet.vehicle_make = req.body.vehicle_make;

            driverDet.vehicle_model = req.body.vehicle_model;

            driverDet.vehicle_color = req.body.vehicle_color;

            if (req.files[0].originalname == 'vehicle.jpg' && req.files[1].originalname == 'license.jpg') {

                driverDet.vehicle_image = req.files[0].filename;

                driverDet.license_image = req.files[1].filename;

            }

            else if (req.files[1].originalname == 'vehicle.jpg' && req.files[0].originalname == 'license.jpg') {

                driverDet.vehicle_image = req.files[1].filename;

                driverDet.license_image = req.files[0].filename;
            }

            let filePath = config.upload_url + 'drivers/';

            if (!fs.existsSync(filePath)) fs.mkdirSync(filePath, 0777);

            filePath += driverDet.user_id;

            if (!fs.existsSync(filePath)) fs.mkdirSync(filePath, 0777);

            let tempPath1 = config.upload_url + 'drivers/temp/' + driverDet.vehicle_image,

                newPath1 = config.upload_url + 'drivers/' + driverDet.user_id + '/' + driverDet.vehicle_image;

            fs.renameSync(tempPath1, newPath1);

            let tempPath2 = config.upload_url + 'drivers/temp/' + driverDet.license_image,

                newPath2 = config.upload_url + 'drivers/' + driverDet.user_id + '/' + driverDet.license_image;

            fs.renameSync(tempPath2, newPath2);

            functions.insert('driver_profile', driverDet)

                .then((result) => {

                    if (!result.insertId) throw 'Database error';

                    else return functions.update('user_master', { type_id: 3 }, { user_id: driverDet.user_id })
                })
                .then((update) => {

                    if (!update.affectedRows) throw 'Database error';

                    else {

                        driverDet.vehicle_image = config.site_url + 'drivers/' + driverDet.user_id + '/' + driverDet.vehicle_image;

                        driverDet.license_image = config.site_url + 'drivers/' + driverDet.user_id + '/' + driverDet.license_image;

                        return user.getEmailById(driverDet.user_id)


                    }
                })
                .then((goStripe) => {

                    driverDet.email = goStripe[0].email;

                    return stripe.createAccount(goStripe[0], acctDet);

                })
                .then((acct) => {
                    console.log("account error:   ", acct);

                    if (!acct.id){
                        functions.update('user_master', { type_id: 2 }, { user_id: driverDet.user_id })
                        res.json({ "status": "false", "function": "insertDriverProfile", "message": "Stripe account not created" });
                    } 

                    else return functions.update('user_master', { account: acct.id }, { email: driverDet.email });

                })
                .then((updateAcc) => {

                    if (updateAcc.affectedRows) {

                        res.json({ "status": "true", "function": "insertDriverProfile", "message": "Driver Profile updated successfully", "result": driverDet });

                    } else {
                        functions.update('user_master', { type_id: 2 }, { user_id: driverDet.user_id })
                        res.json({ "status": "false", "function": "insertDriverProfile", "message": "Stripe account not created" });

                    }
                })

                .catch((err) => {
                    console.log(err);
                    functions.update('user_master', { type_id: 2 }, { user_id: driverDet.user_id })
                    res.json({ "status": "false", "function": "insertDriverProfile", error: err, "message": "Connection error", "errorcode": "serverError" });
                })

        }
    },
    addBankDetails(req, res, next) {
        console.log(req.body);
        acctDet = {};

        acctDet.account_number = req.body.account_number;

        acctDet.routing_number = req.body.routing_number;

        acctDet.ssn_number = req.body.ssn_number;

        acctDet.account_holder = req.body.account_holder;

        let check = dateformat(req.body.dob, 'yyyy/mm/dd');

        acctDet.month = dateformat(check, 'mm');

        acctDet.day = dateformat(check, 'dd');

        acctDet.year = dateformat(check, 'yyyy');

        acctDet.address = req.body.address;

        acctDet.city = req.body.city;

        acctDet.state = req.body.state;

        acctDet.zip = req.body.zipcode;

        user.getUserDetails(req.body.user_id)
        .then((result) => {
            if (result.length) {
                return stripe.createAccount(result[0],acctDet);
            } else {
                res.json({ "status": "false", "function": "addBankDetails", "message": "No details available" });
            }
        })
        .then((acct) => {
            //console.log("account error:   ", acct);

            if (!acct.id) res.json({ "status": "false", "function": "addBankDetails", "message": "Stripe account not created" });

            else return functions.update('user_master', { account: acct.id }, { user_id:req.body.user_id });

        })
        .then((updateAcc) => {
            if (updateAcc.affectedRows) {
                res.json({ "status": "true", "function": "addBankDetails", "message": "Driver Profile updated successfully"});
            } else {
                res.json({ "status": "false", "function": "addBankDetails", "message": "Stripe account not created" });
            }
        })
        .catch((err) => {
            //console.log(err);
            res.json({ "status": "false", "function": "getUserDetails", error: err, "message": "Connection error", "errorcode": "serverError" });
        })
       
    },
    getBankDetails(req, res, next) {
        user.getUserDetails(req.body.user_id)
        .then((result) => {
            if (result.length) {
                return stripe.retrieveExternalAccount('acct_1CUBb2Bru7FuZVlB');
            } else {
                res.json({ "status": "false", "function": "getUserDetails", "message": "No details available" });
            }
        })
        .then((details) => {
            res.json({ "status": "true", "function": "getUserDetails", "message": "No details available" ,"details":details});
            
        })
        .catch((err) => {
            console.log(err);
            res.json({ "status": "false", "function": "getUserDetails", error: err, "message": "Connection error", "errorcode": "serverError" });
        })
    },
    insertUserDetails(req, res, next) {
        if (!req.body.user_id) res.json({ "status": "false", "function": "insertUserDetails", "message": "User Identification required", "errorcode": "validationError" });
        else {

            let userDet = {};

            userDet.user_id = req.body.user_id;

            userDet.address = req.body.address;

            userDet.city = req.body.city;

            userDet.state = req.body.state;

            userDet.zipcode = req.body.zipcode;

            userDet.country = req.body.country;

            functions.insert('user_details', userDet)
                .then((result) => {
                    if (!result.insertId) throw 'Database error';
                    else {
                        res.json({ "status": "true", "function": "insertUserDetails", "message": "User Details updated successfully", "result": userDet });
                    }
                })

                .catch((err) => {
                    console.log(err);
                    res.json({ "status": "false", "function": "insertUserDetails", error: err, "message": "Connection error", "errorcode": "serverError" });
                })

        }
    },
    forgotPassword(req, res, next) {

        if (!req.body.email) res.json({ "status": "false", "function": "forgotPassword", "message": "Mail id not provided", "errorcode": "Validation error" });

        else {
            let pass = '', enpass = '', userDetails = {};

            pass = randomstring.generate(7);

            enpass = functions.encryptPass(pass);

            functions.get('user_master', { email: req.body.email })
                .then((user_details) => {

                    userDetails = user_details[0];

                    if (!user_details.length) res.json({ "status": "false", "function": "forgotPassword", "message": "User Doesnot exsit" });

                    else return functions.update('user_master', { password: enpass }, { user_id: user_details[0].user_id });
                })
                .then((response) => {

                    if (!response.affectedRows) res.json({ "status": "false", "function": "forgotPassword", "message": "Database error" });

                    else {

                        let email_content = `
                                        <p>Hi ${userDetails.first_name} ${userDetails.last_name},</p></br>
                                        <p> We are sorry you forgot your password! Thats okay, please use this temporary password to login.</br>
                                            ${pass}</p></br></br>

                                        <p>Please Change your password for security.</p>

                                    `;

                        return functions._send(userDetails.email, "Puador Forgot Password Mail", email_content);

                    }
                })
                .then((email_response) => {

                    res.json({ "status": "true", "function": "forgotPassword", "message": "New password has been sent to your mail" });
                })
                .catch((err) => {
                    console.log(err);
                    res.json({ "status": "false", "function": "forgotPassword", error: err, "message": "Connection error", "errorcode": "serverError" });
                })
        }
    },
    changePassword(req, res, next) {

        if (!req.body.user_id) res.json({ "status": "false", "function": "changePassword", "message": "User identification not provided", "errorcode": "Validation error" });

        if (!req.body.old_password) res.json({ "status": "false", "function": "changePassword", "message": "Current password not provided", "errorcode": "Validation error" });

        if (!req.body.new_password) res.json({ "status": "false", "function": "changePassword", "message": "New password not provided", "errorcode": "Validation error" });

        else {

            let newPassword = functions.encryptPass(req.body.new_password);

            functions.update('user_master', { password: newPassword }, { user_id: req.body.user_id })
                .then((result) => {

                    if (result.affectedRows) {

                        res.json({ "status": "true", "function": "changePassword", "message": "Password has been changed." });
                    } else {

                        res.json({ "status": "false", "function": "changePassword", "message": "Database error." });
                    }

                })
                .catch((err) => {
                    console.log(err);
                    res.json({ "status": "false", "function": "changePassword", error: err, "message": "Connection error", "errorcode": "serverError" });
                })


        }

    },
    editUser(req, res, next) {

        if (!req.body.user_id) res.json({ "status": "false", "function": "editUser", "message": "User identification not provided", "errorcode": "Validattion error" });

        else {

            let editter = {}, userDet = {};

            editter.email = req.body.email;

            editter.mobile = req.body.phone;

            editter.first_name = req.body.first_name;

            editter.last_name = req.body.last_name;

            if (req.file) {
                editter.profile_image = req.file.filename;
            }

            functions.update('user_master', editter, { user_id: req.body.user_id })
                .then((result) => {

                    if (!result.affectedRows) res.json({ "status": "false", "function": "editUser", "message": "Database error" });

                    else return functions.get('user_master', { user_id: req.body.user_id })
                })
                .then((response) => {

                    if (!response.length) res.json({ "status": "false", "function": "editUser", "message": "Database error" });

                    else {

                        userDet = response[0];

                        userDet.four_digit = response[0].last_4_digit;

                        return functions.get('driver_profile', { user_id: response[0].user_id })

                    }
                })
                .then((drive) => {

                    userDet.driveDet = drive[0];

                    userDet.profile_image = config.site_url + 'users/' + userDet.user_id + '/' + userDet.profile_image;

                    return user.getDriverRating(req.body.user_id);

                })
                .then((D_rating) => {

                    userDet.driver_rating = D_rating[0].driver_rating;

                    return user.getRequesterRating(req.body.user_id);

                })
                .then((U_rating) => {

                    userDet.requester_rating = U_rating[0].requester_rating;

                    res.json({ "status": "true", "function": "editUser", "message": "User informaion updated successfully", "userdetails": userDet });

                })
                .catch((err) => {
                    console.log(err);
                    res.json({ "status": "false", "function": "editUser", error: err, "message": "Server error", "errorcode": "serverError" });
                })

        }

    },
    editDriverProfile(req, res, next) {

        if (!req.body.user_id) res.json({ "status": "false", "function": "driverProfile", "message": "User Identification required", "errorcode": "validationError" });
        else {

            let driverDet = {};

            driverDet.license_no = req.body.license_no;

            driverDet.license_expiry = dateformat(req.body.license_expiry, 'yyyy-mm-dd');

            driverDet.reg_no = req.body.reg_no;

            driverDet.vehicle_make = req.body.vehicle_make;

            driverDet.vehicle_model = req.body.vehicle_model;

            driverDet.vehicle_color = req.body.vehicle_color;

            if (req.files.length) {

                if (req.files[0].originalname == 'vehicle.jpg' || req.files[1].originalname == 'license.jpg') {

                    driverDet.vehicle_image = req.files[0].filename;

                    driverDet.license_image = req.files[1].filename;

                }

                else if (req.files[1].originalname == 'vehicle.jpg' || req.files[0].originalname == 'license.jpg') {

                    driverDet.vehicle_image = req.files[1].filename;

                    driverDet.license_image = req.files[0].filename;
                }


            }

            functions.update('driver_profile', driverDet, { user_id: req.body.user_id })

                .then((result) => {

                    if (!result.affectedRows) throw 'Database error';

                    else return user.getDriverDetails(driverDet.user_id)

                })

                .then((response) => {

                    res.json({ "status": "true", "function": "editDriverProfile", "message": "Driver Profile updated successfully", "result": response[0] });
                })
                .catch((err) => {
                    console.log(err);
                    res.json({ "status": "false", "function": "editDriverProfile", error: err, "message": "Connection error", "errorcode": "serverError" });
                })

        }
    },
    updateDeviceToken(req, res, next) {

        if (!req.body.user_id) res.json({ "status": "false", "function": "updateDeviceToken", "message": "User id not provided" });

        if (!req.body.device_token) res.json({ "status": "false", "function": "updateDeviceToken", "message": "Device token not provided" });

        else {

            functions.update('user_master', { device_token: req.body.device_token, platform: req.body.platform }, { user_id: req.body.user_id })
                .then((result) => {

                    if (result.affectedRows) {

                        res.json({ "status": "true", "function": "updateDeviceToken", "message": "Device token updated." });

                    } else {

                        res.json({ "status": "false", "function": "updateDeviceToken", "message": "Device token not updated." });
                    }
                })
                .catch((err) => {
                    console.log(err);
                    res.json({ "status": "false", "function": "updateDeviceToken", error: err, "message": "Connection error", "errorcode": "serverError" });
                })

        }

    },
    rateUser(req, res, next) {

        if (!req.body.requester_id) res.json({ "status": "false", "function": "rateUser", "message": "User_id not specified" });

        if (!req.body.driver_id) res.json({ "status": "false", "function": "rateUser", "message": "Driver_id not specified" });

        if (!req.body.rating) res.json({ "status": "false", "function": "rateUser", "message": "Please provide rating" });

        else {

            let rate = {};

            rate.user_id = req.body.requester_id;

            rate.rating = req.body.rating;

            rate.driver_id = req.body.driver_id;

            rate.rating_of = req.body.rating_of;

            functions.insert('rating', rate)
                .then((result) => {

                    if (result.insertId) {

                        res.json({ "status": "true", "function": "rateUser", "message": "You have successfully rated." });

                    } else {

                        res.json({ "status": "false", "function": "rateUser", "message": "Rating not done" });
                    }
                })
                .catch((err) => {
                    console.log(err);
                    res.json({ "status": "false", "function": "rateUser", error: err, "message": "Connection error", "errorcode": "serverError" });
                })
        }
    },
    getUserDetails(req, res, next) {

        if (!req.body.user_id) res.json({ "status": "false", "function": "getUserDetails", "message": "User_id not specified" });

        else {

            user.getUserDetails(req.body.user_id)
                .then((result) => {

                    if (result.length) {

                        res.json({ "status": "true", "function": "getUserDetails", "userDetails": result[0] });
                    } else {

                        res.json({ "status": "false", "function": "getUserDetails", "message": "No details available" });
                    }
                })
                .catch((err) => {
                    console.log(err);
                    res.json({ "status": "false", "function": "getUserDetails", error: err, "message": "Connection error", "errorcode": "serverError" });
                })
        }
    },
    getDriverDetails(req, res, next) {

        if (!req.body.driver_id) res.json({ "status": "false", "function": "getDriverDetails", "message": "Driver_id not provided" });

        else {

            user.getDriverProfile(req.body.driver_id)
                .then((result) => {

                    if (result.length) {

                        res.json({ "status": "true", "function": "getDriverDetails", "userDetails": result[0] });
                    } else {

                        res.json({ "status": "false", "function": "getDriverDetails", "message": "No details available" });
                    }
                })
                .catch((err) => {
                    console.log(err);
                    res.json({ "status": "false", "function": "getDriverDetails", error: err, "message": "Connection error", "errorcode": "serverError" });
                })
        }
    },
    addCard(req, res, next) {

        if (!req.body.source_token) res.json({ "status": "false", "function": "addCard", "message": "Card Token not provided" });

        if (!req.body.four_digit) res.json({ "status": "false", "function": "addCard", "message": "Last four_digit not provided" });

        if (!req.body.exp_date) res.json({ "status": "false", "function": "addCard", "message": "Expiry date not provided" });

        else {

            let userDet = {};

            user.getEmailById(req.body.user_id)
                .then((result) => {

                    if (!result.length) res.json({ "status": "false", "function": "addCard", "message": "Database error." });

                    else {

                        userDet = result[0];

                        return stripe.createCustomer(result[0].email, req.body.source_token);

                    }

                })
                .then((response) => {

                    if (!response.id) res.json({ "status": "false", "function": "addCard", "message": "Stripe customer id not created." });

                    else return functions.update('user_master', { stripe_customer_id: response.id, last_4_digit: req.body.four_digit, exp_date: req.body.exp_date }, { email: userDet.email });

                })
                .then((updated) => {

                    if (updated.affectedRows) {

                        res.json({ "status": "true", "function": "addCard", "message": "Card added successfully" });
                    } else {

                        res.json({ "status": "false", "function": "addCard", "message": "Card not added" });

                    }
                })
                .catch((err) => {
                    console.log(err);
                    res.json({ "status": "false", "function": "addCard", error: err, "message": "Connection error", "errorcode": "serverError" });
                })
        }

    },
    getAboutParams(req, res, next) {
        config.getConfig()
            .then((response) => {
                let configur = {}
                configur.address = response.address[0];
                configur.phone = response.phone[0];
                configur.addMail = response.addMail[0];
                configur.feedMail = response.feedMail[0];
                configur.terms = response.tchtml[0];
                configur.privacy = response.pphtml[0];
                configur.appshareurl = response.appshareurl[0];
                configur.appsharetext = response.appsharetext[0];
                res.json({ "status": "true", "result": configur });
            })
    },
    getProOfPuador(req, res, next) {

        user.getProOfPuador()
            .then((result) => {

               let resp= { title: result[0].title, content: result[0].description }

                res.json({"status":"true","function":"getProOfPuador","result":resp});

                //res.render('proOfPuador', );
            })
            .catch((err) => {

                console.log(err);
                res.json({ "status": "fail", error: err, "errorcode": "serverError" });
            })
    },

};
module.exports = handler;
