let functions = require('../helpers/functions'),
    mysql = require('mysql'),
    config = require('../server/config');


    let instructorDao = {

        updateCertificateAdded(user_id){
                let sql = `UPDATE user_master SET certificate_added = 'Y' WHERE id=` + user_id;
                return functions.selectQuery(sql);
        },
        getAllServices(instructor_id){
                let sql = `SELECT service_master.id, service_master.title,IF((SELECT service_id FROM service_plans  WHERE instructor_id = ` + instructor_id  +` and service_id = service_master.id) IS NULL,"false","true") as is_selected FROM service_master  WHERE  service_master.active = 'Y' AND  service_master.deleted_at IS NULL`;
                return functions.selectQuery(sql);
        },
        updateServiceAdded(user_id){
            let sql = `UPDATE user_master SET service_added = 'Y' WHERE id=` + user_id;
            return functions.selectQuery(sql);
        },
    
        updatePackageAdded(user_id){
            let sql = `UPDATE user_master SET package_added = 'Y' WHERE id=` + user_id;
            return functions.selectQuery(sql);
        },

        getMyBookings(instructor_id,sortBy,filter,search,offset,limit){
            let sql = `SELECT bookings.booking_id,bookings.status,DATE_FORMAT(bookings.booking_date,'%m/%d/%Y, %H:%i %p') as booking_date,
                       DATE_FORMAT(bookings.cancelled_date,'%m/%d/%Y, %H:%i %p') as cancelled_date, bookings.cancelled_by,
                       bookings.user_id,user_master.first_name,user_master.last_name,IFNULL(user_master.phone,'') AS phone,user_master.email,
                       IFNULL(user_master.image,CONCAT('`+ config.site_url+ `users/noimage.jpg')) as profile_image,
                       (SELECT COUNT(*) FROM chat_master WHERE is_read = 'N' AND ((to_id = bookings.user_id OR to_id = `+ instructor_id +`) AND (from_id = bookings.user_id OR from_id = `+ instructor_id +`))) as unread_count,
                       packages.num_of_lessons,packages.cost
                       FROM bookings LEFT JOIN user_master ON user_master.id = bookings.user_id
                       LEFT JOIN packages ON packages.id = bookings.package_id
                       WHERE bookings.instructor_id = ` + instructor_id;

            if(filter != undefined && typeof(filter) != undefined && filter != ''){
                let Jfilter = JSON.parse(filter);

                sql += ` AND  bookings.status IN (${mysql.escape(Jfilter)})`;
            }

            if(search != undefined && typeof(search) != undefined && search != ''){
                sql += ` AND (bookings.booking_id = ${mysql.escape(search)} OR user_master.first_name LIKE '`+search+`%' OR user_master.last_name LIKE '`+search+`%')`;
            }

            if(sortBy != undefined && typeof(sortBy) != undefined && sortBy != ''){
                sql += ` ORDER BY bookings.booking_date ` + sortBy ;
            }else{
                sql += ` ORDER BY bookings.booking_date DESC`;
            }

            if(offset != undefined && limit != undefined){
                sql += ` LIMIT ` + offset + `,` + limit ;
            }

           

            return functions.selectQuery(sql);
        },

        getMyBookingCount(instructor_id,sortBy,filter,search){
            let sql = `SELECT COUNT(bookings.booking_id) AS booking_count
                       FROM bookings LEFT JOIN user_master ON user_master.id = bookings.user_id
                       LEFT JOIN packages ON packages.id = bookings.package_id
                       WHERE bookings.instructor_id = ` + instructor_id;

            if(filter != undefined && typeof(filter) != undefined && filter != ''){
                let Jfilter = JSON.parse(filter);

                sql += ` AND  bookings.status IN (${mysql.escape(Jfilter)})`;
            }

            if(search != undefined && typeof(search) != undefined){
                sql += ` AND (bookings.booking_id = ${mysql.escape(search)} OR user_master.first_name LIKE '`+search+`%' OR user_master.last_name LIKE '`+search+`%')`;
            }

            if(sortBy != undefined && typeof(sortBy) != undefined){
                sql += ` ORDER BY bookings.booking_date ` + sortBy ;
            }else{
                sql += ` ORDER BY bookings.booking_date DESC`;
            }

                     

            return functions.selectQuery(sql);
        },


        getInstructorDetails(instructor_id){

            let sql = `SELECT user_master.first_name,user_master.last_name,user_master.email,user_master.id as instructor_id,
            IFNULL(user_master.facebook_id,'') as facebook_id,
            IFNULL(user_master.image,CONCAT('`+ config.site_url+ `users/noimage.jpg')) as profile_image,
            IFNULL(user_master.city,'') as city,IFNULL(user_master.state,'') as state,
            IFNULL(user_master.street_address,'') as street_address,
            IFNULL(user_master.zip_code,'') as zip,
            IFNULL(user_master.phone,'') as phone,
            IFNULL(user_master.bank_account,'') as bank_account,
            IFNULL(user_master.lat,'') as lat,
            IFNULL(user_master.lng,'') as lng,
            IFNULL(user_master.gender,'') as gender,
            IFNULL((YEAR(CURDATE()) - YEAR(user_master.dob)),'') AS age,
            IFNULL(user_master.dob,'') AS dob,
            IFNULL((SELECT ROUND(SUM(ratings)/COUNT(ratings))  FROM ratings_master WHERE instructor_id = user_master.id),0) AS rating
            FROM user_master WHERE user_master.id = ` + instructor_id;

            return functions.selectQuery(sql);
        },

        deleteExistingServices(instructor_id){

            let sql = `DELETE FROM service_plans WHERE instructor_id = `+ instructor_id;

            return functions.selectQuery(sql);
        },

        deleteExistingCertificates(instructor_id){

            let sql = `DELETE FROM certifications WHERE instructor_id = `+ instructor_id;

            return functions.selectQuery(sql);
        },
        deleteExistingPackages(instructor_id){

            let sql = `DELETE FROM packages WHERE instructor_id = `+ instructor_id;

            return functions.selectQuery(sql);
        },
        getAllPackages(instructor_id){

            let sql = `SELECT num_of_lessons, cost FROM packages WHERE instructor_id = ` + instructor_id;

            return functions.selectQuery(sql);
        },
        getAllCertificates(instructor_id){

            let sql = `SELECT certificate_name,authority_name,document_id,certificate FROM certifications WHERE instructor_id = `+ instructor_id;

            return functions.selectQuery(sql);
        },
        getAccountDet(user_id){

            let sql = `SELECT IFNULL(bank_name,'') AS bank_name,IFNULL(account_4_digit,'') AS account_4_digit FROM user_master WHERE id = ` + user_id;

            return functions.selectQuery(sql);
        },
        getAdminFee(){

            let sql = `SELECT value FROM general_config WHERE field = 'admin_commission'`;

            return functions.selectQuery(sql);
        },
        getTransactionId(booking_id){

            let sql = `SELECT transaction_id FROM bookings WHERE booking_id = ${mysql.escape(booking_id)}`;

            return functions.selectQuery(sql);
        },
        getBookingCost(booking_id){

            let sql = `SELECT packages.instructor_id, bookings.package_id, bookings.user_id, bookings.card_token, packages.cost, packages.instructor_cost, packages.admin_cost, UM1.bank_account,UM2.stripe_id,
                    (SELECT value FROM general_config WHERE field = 'admin_commission') AS admin_com
                    FROM bookings LEFT JOIN packages ON bookings.package_id = packages.id 
                    LEFT JOIN user_master UM1 ON UM1.id = packages.instructor_id
                    LEFT JOIN user_master UM2 ON UM2.id = bookings.user_id
                    WHERE bookings.booking_id =  ${mysql.escape(booking_id)}`;

            return functions.selectQuery(sql);
        },
        getPaymentLastYear(instructor_id){

            let sql = `SELECT IFNULL(SUM(amount),0) as yearly_payment FROM payment_reports WHERE YEAR(created_at) = YEAR(CURDATE()) AND status='accepted' AND instructor_id = ` + instructor_id;

            return functions.selectQuery(sql);
        },
        getPaymentThisMonth(instructor_id){

            let sql = `SELECT IFNULL(SUM(amount),0) as monthly_payment FROM payment_reports WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) AND status='accepted' AND instructor_id = ` + instructor_id;

            return functions.selectQuery(sql);
        },

        getPaymentThisWeek(instructor_id){

            let sql = `SELECT IFNULL(SUM(amount),0) as weekly_payment FROM payment_reports WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1) AND status='accepted' AND instructor_id = ` + instructor_id;

            return functions.selectQuery(sql);
        },

        getPaymentLastTen(instructor_id){

            let sql = `SELECT IFNULL(SUM(amount),0) as last_ten FROM payment_reports WHERE  status='accepted' AND instructor_id = ` + instructor_id + ` limit 10`;

            return functions.selectQuery(sql);
        },
        getPaymentWhole(instructor_id){
             
            let sql = `SELECT IFNULL(SUM(amount),0) as wholeTime FROM payment_reports WHERE  status='accepted' AND instructor_id = ` + instructor_id ;

            return functions.selectQuery(sql);

        },
        getAllPayment(instructor_id){

            let sql = `SELECT payment_reports.amount,user_master.first_name,user_master.last_name,user_master.image as profile_image,
                       DATE_FORMAT(bookings.booking_date,'%m/%d/%Y, %H:%i %p') as booking_date,bookings.booking_id
                       FROM payment_reports LEFT JOIN user_master ON user_master.id = payment_reports.user_id
                       LEFT JOIN bookings ON payment_reports.booking_id = bookings.booking_id WHERE  payment_reports.status='accepted' AND payment_reports.instructor_id = ` + instructor_id ;

            return functions.selectQuery(sql);
        },
        getBankAccount(instructor_id){

            let sql = `SELECT IFNULL(bank_account,'') as bank_account FROM user_master WHERE id = ` + instructor_id;

            return functions.selectQuery(sql);
        },

        deleteBankDet(instructor_id){

            let sql = `UPDATE user_master SET bank_account = '', bank_name = '', account_4_digit = '' WHERE id = ` + instructor_id;

            return functions.selectQuery(sql);
        }


        
    }


    module.exports = instructorDao;