let functions = require('../helpers/functions'),
    mysql = require('mysql'),
    config = require('../server/config');

let userDao = {

   getDefaultDistance(){
         let sql = `SELECT value FROM general_config WHERE field = 'default_distance'`;
         return functions.selectQuery(sql);
   },
   getInstructor(distance,lat,lng,offset,limit,sortBy,filter){

      let sql = '';

      if(lat != undefined && lng != undefined && lat != '' && lng != ''){

         sql = `SELECT user_master.first_name, user_master.last_name,user_master.id as instructor_id,
         IFNULL(user_master.image,CONCAT('`+ config.site_url+ `users/noimage.jpg')) as profile_image,
         IFNULL(user_master.city,'') as city,IFNULL(user_master.state,'') as state,
         IFNULL(user_master.zip_code,'') as zip, IFNULL(user_master.phone,'') as phone,
         SQRT( POW(69.1 * (user_master.lat - '`+ lat +`'), 2) + 
         POW(69.1 * ('`+lng+`' - user_master.lng) * COS(user_master.lat / 57.3), 2)) as distance ,
         IFNULL((SELECT ROUND(SUM(ratings)/COUNT(ratings))  FROM ratings_master WHERE instructor_id = user_master.id),0) AS rating
         FROM user_master INNER JOIN service_plans ON service_plans.instructor_id = user_master.id WHERE user_type = 3`
         

      }else {

         sql = `SELECT user_master.first_name, user_master.last_name,user_master.id as instructor_id,
         IFNULL(user_master.image,CONCAT('`+ config.site_url+ `users/noimage.jpg')) as profile_image,
         IFNULL(user_master.city,'') as city,IFNULL(user_master.state,'') as state, IFNULL(user_master.phone,'') as phone,
         IFNULL(user_master.zip_code,'') as zip,
         IFNULL((SELECT ROUND(SUM(ratings)/COUNT(ratings))  FROM ratings_master WHERE instructor_id = user_master.id),0) AS rating
         FROM user_master INNER JOIN service_plans ON service_plans.instructor_id = user_master.id WHERE user_type = 3`;
      }

      if(filter != undefined && typeof(filter) != undefined && filter != ''){
            let Jfilter = JSON.parse(filter);
         sql += ` AND service_plans.service_id IN (${mysql.escape(Jfilter)})`;
      }

      sql += ` GROUP BY service_plans.instructor_id`;
      
      if(lat != undefined && lng != undefined && lat != '' && lng != ''){
         sql += ` HAVING distance < ` + distance;
      }

      

      if(sortBy != undefined && typeof(sortBy) != undefined && sortBy != ''){
         sql += ` ORDER BY rating ` + sortBy ;
      }else{
         sql += ` ORDER BY rating DESC`;
      }

      if(offset != undefined && limit != undefined){
            
         sql += ` LIMIT ` + offset + `,` + limit ;
      }

      return functions.selectQuery(sql);
   },

   getInstructorCount(distance,lat,lng,sortBy,filter){

      let sql = 'SELECT count(*) AS instructor_count FROM (';

            if(lat != undefined && lng != undefined && lat != '' && lng != ''){

               sql += `SELECT SQRT( POW(69.1 * (user_master.lat - '`+ lat +`'), 2) + 
                     POW(69.1 * ('`+lng+`' - user_master.lng) * COS(user_master.lat / 57.3), 2)) as distance,
                     IFNULL((SELECT ROUND(SUM(ratings)/COUNT(ratings))  FROM ratings_master WHERE instructor_id = user_master.id),0) AS rating   
                     FROM user_master INNER JOIN service_plans ON service_plans.instructor_id = user_master.id WHERE user_type = 3`
               

            }else {

               sql += `SELECT IFNULL((SELECT ROUND(SUM(ratings)/COUNT(ratings))  FROM ratings_master WHERE instructor_id = user_master.id),0) AS rating 
                     FROM user_master INNER JOIN service_plans ON service_plans.instructor_id = user_master.id WHERE user_type = 3`;
            }

            if(filter != undefined && typeof(filter) != undefined && filter != ''){
                  let Jfilter = JSON.parse(filter);
               sql += ` AND service_plans.service_id IN (${mysql.escape(Jfilter)})`;
            }

            sql += ` GROUP BY service_plans.instructor_id`;
            
            if(lat != undefined && lng != undefined && lat != '' && lng != ''){
               sql += ` HAVING distance < ` + distance;
            }

            

            if(sortBy != undefined && typeof(sortBy) != undefined && sortBy != ''){
               sql += ` ORDER BY rating ` + sortBy ;
            }else{
               sql += ` ORDER BY rating DESC`;
            }

      sql += `) AS tmp`;
       
      console.log("sql",sql);
     
      return functions.selectQuery(sql);
   },

   getInstructorDetails(instructor_id){

      let sql = `SELECT first_name, last_name,email, IFNULL((YEAR(CURDATE()) - YEAR(dob)),'') AS age,IFNULL(city,'') AS city,IFNULL(state,'') AS state,
                 IFNULL(user_master.image,CONCAT('`+ config.site_url+ `users/noimage.jpg')) as profile_image,
                  IFNULL(zip_code,'') as zip, IFNULL(gender,'') as gender, IFNULL(user_master.phone,'') as phone,
                  IFNULL((SELECT ROUND(SUM(ratings)/COUNT(ratings))  FROM ratings_master WHERE instructor_id = user_master.id),0) AS rating
                  FROM user_master WHERE id = ` + instructor_id;

      return functions.selectQuery(sql);
   },

   getInstructorPackages(instructor_id){

      let sql = `SELECT id as package_id,num_of_lessons,cost FROM packages WHERE instructor_id = ` + instructor_id;

      return functions.selectQuery(sql);

   },

   getInstructorServices(instructor_id){

      let sql = `SELECT service_plans.service_id,service_master.title FROM service_plans
               INNER JOIN service_master ON service_plans.service_id = service_master.id
               WHERE service_master.active = 'Y' AND  service_plans.instructor_id = ` + instructor_id;

      return functions.selectQuery(sql);
   },
   getInstructorRating(instructor_id){

      let sql = `SELECT ratings_master.ratings,ratings_master.reviews,
               IFNULL(user_master.image,CONCAT('`+ config.site_url+ `users/noimage.jpg')) as profile_image,
               user_master.id, user_master.first_name,user_master.last_name, DATE_FORMAT(ratings_master.review_date,'%m/%d/%Y, %H:%i %p') AS review_date FROM ratings_master 
               INNER JOIN user_master ON ratings_master.user_id = user_master.id WHERE ratings_master.instructor_id = `+ instructor_id;

      return functions.selectQuery(sql);
   },
   getMyBookings(user_id,search,sortBy,filter){

      let sql = `SELECT bookings.booking_id, user_master.first_name,user_master.last_name, bookings.instructor_id,
               DATE_FORMAT(bookings.booking_date,'%m/%d/%Y, %H:%i %p') AS booking_date, 
               IFNULL(user_master.image,CONCAT('`+ config.site_url+ `users/noimage.jpg')) as profile_image,
               bookings.status FROM bookings LEFT JOIN user_master ON user_master.id = bookings.instructor_id
               WHERE bookings.user_id = ` + user_id;

      if(filter != undefined && typeof(filter) != undefined){

         let Jfilter = JSON.parse(filter);

         sql += ` AND  bookings.status IN (${mysql.escape(Jfilter)})`;
      }

      if(search != undefined && typeof(search) != undefined){
         
         sql += ` AND (bookings.booking_id = ${mysql.escape(search)} OR user_master.first_name LIKE '`+search+`%' OR user_master.last_name LIKE '`+search+`%')`;
      }
      
      if(sortBy != undefined && typeof(sortBy) != undefined){

         sql += ` ORDER BY booking_date ` + sortBy ;

      }else{

         sql += ` ORDER BY booking_date DESC`;

      }



      return functions.selectQuery(sql);
   },
   getBookingDetails(user_id,booking_id){

      let sql = `SELECT user_master.first_name,user_master.email,user_master.id as instructor_id, user_master.last_name, IFNULL((YEAR(CURDATE()) - YEAR(user_master.dob)),'') AS age,IFNULL(user_master.city,'') AS city,
                  IFNULL(user_master.state,'') AS state,IFNULL(user_master.zip_code,'') as zip, IFNULL(user_master.gender,'') as gender,IFNULL(user_master.phone,'') as phone,
                  IFNULL((SELECT ROUND(SUM(ratings)/COUNT(ratings))  FROM ratings_master WHERE instructor_id = user_master.id),0) AS rating, bookings.status, 
                  packages.num_of_lessons,packages.cost,bookings.id,DATE_FORMAT(bookings.booking_date,'%m/%d/%Y, %H:%i %p') AS booking_date
                  FROM bookings LEFT JOIN user_master ON user_master.id = bookings.instructor_id
                  LEFT JOIN packages ON packages.id = bookings.package_id
                  WHERE bookings.booking_id = ${mysql.escape(booking_id)}` ;

      

      return functions.selectQuery(sql);
   },
   getStripeId(user_id){

      let sql = `SELECT stripe_id FROM user_master WHERE id = ` + user_id;

      return functions.selectQuery(sql);
   },
   getInstructorFromPackageId(package_id){

      let sql = `SELECT packages.instructor_id, packages.cost, packages.instructor_cost, packages.admin_cost, user_master.bank_account,
                  (SELECT value FROM general_config WHERE field = 'admin_commission') AS admin_com
                  FROM packages LEFT JOIN user_master ON user_master.id = packages.instructor_id
                  WHERE packages.id = ` + package_id;

      return functions.selectQuery(sql);
   },

   getTransactionId(booking_id){

      let sql = `SELECT transaction_id FROM bookings WHERE booking_id = ${mysql.escape(booking_id)}`;

      return functions.selectQuery(sql);
   },

   getAllMessages(user_id){

      let sql = `SELECT res.*,(
         SELECT COUNT(*) AS cnt FROM chat_master WHERE to_id = `+ user_id +` AND from_id = 
         IF ( res.to_id = `+ user_id +`, res.from_id, res.to_id) AND is_read = 'N') AS cnt FROM (
         SELECT IF ( T1.to_id = `+ user_id +`, T1.from_id, T1.to_id) AS user_id,
              T1.*,
         if(timestampdiff(YEAR,T1.created_at, now()) >= 1,CONCAT(timestampdiff(YEAR,T1.created_at, now()),' years'),IF(timestampdiff(MONTH,T1.created_at, now()) >=1, CONCAT(timestampdiff(MONTH,T1.created_at, now()),' month'),if(timestampdiff(DAY,T1.created_at, now()) >=1,if(timestampdiff(DAY,T1.created_at, now()) =1,CONCAT(timestampdiff(DAY,T1.created_at, now()),' day'),CONCAT(timestampdiff(DAY,T1.created_at, now()),' days')),if(timestampdiff(HOUR,T1.created_at, now())>=1,CONCAT(timestampdiff(HOUR,T1.created_at, now()),' hr'),CONCAT(timestampdiff(MINUTE,T1.created_at, now()),' min'))))) as ago,
         T2.first_name as first_name,  T2.image AS profile_image
         FROM chat_master T1 LEFT JOIN user_master T2 ON T2.id = IF ( T1.to_id = `+ user_id +`, T1.from_id, T1.to_id)
         WHERE (T1.id = (SELECT id FROM chat_master WHERE (( to_id = T1.to_id AND from_id = T1.from_id)
         OR ( to_id = T1.from_id AND from_id = T1.to_id))  ORDER BY id DESC LIMIT 1))
         AND ( T1.from_id = `+ user_id +` OR T1.to_id = `+ user_id +`)  ) AS res ORDER BY res.id DESC `

      return functions.selectQuery(sql);
   },
   getChatsBtwTwo(user_id,chatted_id){

      let sql = `SELECT T1.*,U1.first_name AS to_user_name, U2.first_name AS from_user_name,
                 if(timestampdiff(YEAR,T1.created_at, now()) >= 1,CONCAT(timestampdiff(YEAR,T1.created_at, now()),' years'),IF(timestampdiff(MONTH,T1.created_at, now()) >=1, CONCAT(timestampdiff(MONTH,T1.created_at, now()),' month'),if(timestampdiff(DAY,T1.created_at, now()) >=1,if(timestampdiff(DAY,T1.created_at, now()) =1,CONCAT(timestampdiff(DAY,T1.created_at, now()),' day'),CONCAT(timestampdiff(DAY,T1.created_at, now()),' days')),if(timestampdiff(HOUR,T1.created_at, now())>=1,CONCAT(timestampdiff(HOUR,T1.created_at, now()),' hr'),CONCAT(timestampdiff(MINUTE,T1.created_at, now()),' min'))))) as ago,
                 U1.image as to_user_image,U2.image as from_user_image FROM chat_master T1
                 LEFT JOIN user_master U1 ON U1.id = T1.to_id
                 LEFT JOIN user_master U2 ON U2.id = T1.from_id
                 WHERE (T1.to_id = `+ user_id +` OR T1.from_id = `+ user_id +` ) AND  (T1.to_id = `+ chatted_id +` OR T1.from_id = `+ chatted_id +`)`;

      return functions.selectQuery(sql);
   },
   getStripeId(user_id){

      let sql = `SELECT stripe_id FROM user_master WHERE id = ` + user_id;

      return functions.selectQuery(sql);
   }
};

module.exports = userDao;