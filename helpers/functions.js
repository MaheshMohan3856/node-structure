let connectionProvider = require("../server/dbConnectionProvider"),
	crypto = require('crypto'),
	merge = require('merge'),
	fs = require('fs'),
	mysql = require('mysql'),
	jsonfile = require('jsonfile'),
	config = require('../server/config'),
	nodemailer = require('nodemailer'),
	jwt = require('jsonwebtoken'),
	request = require('request');

let functions = {
    get(table, cond) {
		var self = this;
        var sql = "SELECT * FROM " + table;        
		if (typeof (cond) == "object") {
			sql += " WHERE ";
			for (var key in cond) {
				sql += key + " = '" + cond[key] + "' AND ";
			}
			sql = sql.substring(0, sql.length - 4);
        }        
        return self.selectQuery(sql);
	},
	insert(table, data) {
		var self = this;
		var sql = "INSERT INTO " + table + " SET ?";
		if (typeof (data) == "object") {
			return self.processQuery(sql, data);
		} else {
			return false;
		}
	},
	update(table, fields, cond) {
		var self = this;
		var sql = "UPDATE " + table + " SET ";
		for (var key in fields) {
			sql += key + " = ?,";
		}
		sql = sql.substring(0, sql.length - 1) + " WHERE ";
		for (var ky in cond) {
			sql += ky + " = ? AND ";
		}
		sql = sql.substring(0, sql.length - 4);

		var original = merge(fields, cond);
		var data = [];
		for (var attr in original) {
			data.push(original[attr]);
		}
		return self.processQuery(sql, data);
	},
	delete(table, cond) {
		var self = this;
		var sql = "DELETE FROM " + table + " WHERE 1";
		if (typeof (cond) == 'object') {
			for (var key in cond) {
				sql += " AND " + key + "='" + cond[key] + "'";
			}
			return self.selectQuery(sql);
		} else {
			return false;
		}
	},
	selectQuery(sql) {
		return new Promise((resolve, reject) => {
			let connection = connectionProvider.dbConnectionProvider.getMysqlConnection();
			connection.query(sql, (err, result)=>{
				if(err) reject(err);
				else resolve(result);
			});
			connectionProvider.dbConnectionProvider.closeMysqlConnection(connection);
		}) 
	},
	getLatLng(place_id){
         return new Promise((resolve,reject)=>{
			 request(config.google_url + 'place/details/json?placeid='+ place_id +'&key=' +config.google_key,(err,result)=>{				 
				 if(err) reject(err);
				 else resolve(result.body); 
			 })
		 })
	},
    processQuery(sql, data) {
		return new Promise((resolve, reject)=> {
			let connection = connectionProvider.dbConnectionProvider.getMysqlConnection();			
			connection.query(sql, data, (err, result) => {
				if(err) reject(err);
				else resolve(result);
			})
			connectionProvider.dbConnectionProvider.closeMysqlConnection(connection);
		})
    },
    getCount(table, cond) {
		var self = this;
		var sql = "SELECT count(*) as count FROM " + table;
		if (typeof (cond) == "object") {
			sql += " WHERE ";
			for (var key in cond) {
				sql += key + " = '" + cond[key] + "' AND ";
			}
			sql = sql.substring(0, sql.length - 4);
		}
		return self.selectQuery(sql);
	},
	encryptPass(password) {
		if(password != undefined){
			let cipher = crypto.createCipher(config.encrypt_algorithm, config.encrypt_pass);
			let crypted = cipher.update(password, 'utf8', 'hex');
			crypted += cipher.final('hex');
			return crypted;
		} else return;
	},
	decryptPass(encrypted) {
		if(encrypted != undefined){
			let decipher = crypto.createDecipher(config.encrypt_algorithm, config.encrypt_pass);			
			let dec = decipher.update(encrypted, 'hex', 'utf8');			
			dec += decipher.final('utf8');
			return dec;
		} else return;
	},
	unlinkFiles(path) {
        let files = fs.readdirSync(path);
        
        let readFiles = function(filename, index){
            fs.unlinkSync(path + filename);            
        }

        return files.forEach(readFiles);		
	},
	createRefreshTokenJsonFile(user, refreshToken){
		let refreshTokenMapping = {};
		let jsonFilePath  = 'public/uploads/';

		if(!fs.existsSync(jsonFilePath)) fs.mkdirSync(jsonFilePath, 0777);

		jsonFilePath += 'users/';

		if(!fs.existsSync(jsonFilePath)) fs.mkdirSync(jsonFilePath, 0777);

		jsonFilePath += user.user_id + "/";

		if(!fs.existsSync(jsonFilePath)) fs.mkdirSync(jsonFilePath, 0777);

		jsonFilePath += 'refreshtoken.json';

		refreshTokenMapping[refreshToken] = user.email;

		return jsonfile.writeFileSync(jsonFilePath, refreshTokenMapping);
	},
	createCountriesJson(countries){
		let jsonPath = 'public/uploads/';

		if(!fs.existsSync(jsonPath)) fs.mkdirSync(jsonPath, 0777);

		jsonPath += 'countries.json';

		return jsonfile.writeFileSync(jsonPath, countries);
	},
	getCountriesJson(){
		let jsonPath = 'public/uploads/countries.json';

		if(fs.existsSync(jsonPath))
			return jsonfile.readFileSync(jsonPath)
		else
			return;
	},
	getConfigData(){
		return new Promise((resolve, reject) => {
			let sql = "SELECT field, value FROM general_config";
			this.selectQuery(sql)
			.then((confData)=>{
				if(confData != undefined){
					function arrayToObj (array, fn) {
						var obj = {};
						var len = array.length;
						for (var i = 0; i < len; i++) {
							var item = fn(array[i], i, array);
							obj[item.key] = item.value;
						}
						return obj;
					};
		
		
					var objectMap = arrayToObj(confData,function (item) {
						return {key:item.field,value:item.value};
					});
		
		           if(objectMap != undefined){
					   resolve(objectMap) ;
				   }else{
					   reject('No config data found');
				   }
					
				}
			})
			.catch((err)=>{
				reject('No config data found');
			})
	    })
		 
	},
	_send(to, subject, template,replaceData) {

		
		return new Promise((resolve, reject) => {
			 this.getConfigData().then((configData)=>{

					   
				var transporter = nodemailer.createTransport({
					service: 'gmail',
					auth: {
						user: configData.smtp_email,
						pass: configData.smtp_email_password
					}
				});
				Object.keys(replaceData).forEach((key) => {
					template = template.replace(new RegExp(key, 'g'), replaceData[key]);
					subject = subject.replace(new RegExp(key, 'g'), replaceData[key]);
				});
				var mailOptions = {
					from: configData.smtp_email,
					to: to,
					subject: subject,
					html: template
				};
		
				transporter.sendMail(mailOptions, (err, info) => {
					if(err){
						
						reject(err);
					}else{
						
						resolve({ 'status': 'success', 'message': 'Message sent successfully.' });
					}
				})
			 })
			 .catch((err)=>{
				 console.log(err);
				reject(err);
			})
			
			
		});
	},
	middleware(req, res, next){
		
		let token = req.headers['authtoken'] || '';

    	let method = req.method;           

		token = token.replace(/^Bearer\s/, '');  
		
		let verify_response = function(err, decoded){

			if(!err){
				req.decoded = decoded;

				next();
				
			} else if(err.name == 'TokenExpiredError'){

				let originalDecoded = jwt.decode(token, {complete: true});             

				req.decoded = originalDecoded.payload;

				let user = req.decoded;

				delete user['exp']; delete user['iat'];

				let jsonFilePath = 'public/uploads/users/' + originalDecoded.payload.user_id + '/refreshtoken.json';

				let refreshToken = req.headers['refreshtoken'] || '';

				let jsonObj;

				if(fs.existsSync(jsonFilePath)) jsonObj = jsonfile.readFileSync(jsonFilePath);       
				
				console.log("jsonObj[refreshToken]",jsonObj[refreshToken]);

				if(jsonObj[refreshToken] == originalDecoded.payload.email){
					var refreshed = jwt.sign(user, config.secret, {
						expiresIn: 10000
					});
					res.setHeader('AuthToken', refreshed);
					next();                   
				}else{
					return res.json({ status: false, error: 'Token expired.', 'statusCode': 'TokenExpired' });
				}
			}else{
				return res.json({ status: false, error: 'Failed to authenticate token.', 'statusCode': "TokenInvalid" });
			}
		}

		if(method != 'OPTIONS'){
			if (token) {            
				jwt.verify(token, config.secret, verify_response);  

			} else {           
				return res.status(403).send({
					status: 'fail', 
					error: 'No token provided.',
					statusCode: "TokenMissing"
				});
			}
		}else{
			return res.json({status: "success", "message": "Server preflight verification success."});
		}
	}
	

}

module.exports = functions;