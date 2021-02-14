let functions = require('../helpers/functions'),
    mysql = require('mysql'),
    config = require('../server/config');

let authDao = {
    getUserByEmail(email=''){
        let sql = `SELECT id as user_id, email, user_type, first_name, last_name, stripe_id, password, certificate_added, service_added, package_added,active, admin_approved,IFNULL(bank_account,'') as bank_account, IFNULL(facebook_id,'') as facebook_id,
                   IFNULL(image,CONCAT('`+ config.site_url+ `users/noimage.jpg')) as profile_image, IFNULL(phone,'') as phone, IFNULL(gender,'') as gender,IFNULL(dob,'') as dob,  IFNULL((YEAR(CURDATE()) - YEAR(dob)),'') AS age
                   FROM user_master WHERE email = ${mysql.escape(email)} AND deleted_at IS NULL`;
           return functions.selectQuery(sql);
   },
   getTemplate(name){
           let sql = `SELECT email_template,email_subject from general_emails WHERE name = '${name}'`;
           return functions.selectQuery(sql);
   },
   updateUserActive(email){
           let sql = `UPDATE user_master SET active='Y' WHERE email=${mysql.escape(email)}`;
           return functions.selectQuery(sql);
   },
   getOtpDetail(email){
        let sql = `SELECT id as user_id,otp,fp_otp,first_name, last_name,user_type
                  FROM user_master WHERE email = ${mysql.escape(email)} AND deleted_at IS NULL`;
        return functions.selectQuery(sql);
   },
   updateForgotOtp(otp,email){
        let sql = `UPDATE user_master SET fp_otp='`+ otp + `' WHERE email=${mysql.escape(email)}`;
        return functions.selectQuery(sql);
   },
   updateEmailOtp(otp,email){
        let sql = `UPDATE user_master SET otp='`+ otp + `' WHERE email=${mysql.escape(email)}`;
        return functions.selectQuery(sql);
   },
   getTemplateWithAdminEmail(name){
        let sql = `SELECT email_template,email_subject,(SELECT value FROM general_config WHERE field = 'admin_email') AS admin_email from general_emails WHERE name = '${name}'`;
        return functions.selectQuery(sql);
   }
  

}


module.exports = authDao;