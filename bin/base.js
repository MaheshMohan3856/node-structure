var functions = require('../helpers/functions');
var userHandlers = require('../handlers/userHandler');
var user = require('../dao/userDao');
var moment = require('moment');
module.exports = function (io) {
	'use strict';	
	var connections = [];	
	var USERS = {};

	io.on('connection', function (socket) {

		socket.user_id = socket.handshake.headers['user_id'];

		

		connections.push(socket);

		

		USERS[socket.handshake.headers['user_id']] = socket;	
	
	  // console.log("USERS: ", USERS);
		
		console.log("Currently %d user(s) joined.", connections.length);		

			
		socket.on('sendMessage',function(data,callback){
		
			var lastMsg = {};

			var mydata = {
				'message': data.msg,
				'from_id': data.from_user_id,
				'to_id': data.to_user_id,
				'created_at': data.date,
				'image_message':data.image_message
				
			}

			console.log("my data: ", mydata);
		
			// var updateNotifications = function(viewers){
            //     let notimessage = 'Hai you have New message from '+data.from_user.user_name;
            //     // for(let i=0;i<viewers.length;i++){
            //         var updateData = {
            //             receiver_id:data.to_user.user_id,
            //             sender_id:data.from_user.user_id,
            //             notify_time:moment(new Date).format('YYYY-MM-DD HH:mm:ss'),
            //             message:notimessage,
            //             status:'N'
            //         }
            //         functions.insert('notifications',updateData);
                   
            //     // }
            // }
			var insertSuccess = async function(response){
				if(response.insertId){
					if(USERS[data.to_user_id] != undefined && USERS[data.from_user_id] != undefined){
						
						let sql = `SELECT T1.*,U1.first_name AS to_user_name, U2.first_name AS from_user_name,
						if(timestampdiff(YEAR,T1.created_at, now()) >= 1,CONCAT(timestampdiff(YEAR,T1.created_at, now()),' years'),IF(timestampdiff(MONTH,T1.created_at, now()) >=1, CONCAT(timestampdiff(MONTH,T1.created_at, now()),' month'),if(timestampdiff(DAY,T1.created_at, now()) >=1,if(timestampdiff(DAY,T1.created_at, now()) =1,CONCAT(timestampdiff(DAY,T1.created_at, now()),' day'),CONCAT(timestampdiff(DAY,T1.created_at, now()),' days')),if(timestampdiff(HOUR,T1.created_at, now())>=1,CONCAT(timestampdiff(HOUR,T1.created_at, now()),' hr'),CONCAT(timestampdiff(MINUTE,T1.created_at, now()),' min'))))) as ago,
						U1.image as to_user_image,U2.image as from_user_image FROM chat_master T1
						LEFT JOIN user_master U1 ON U1.id = T1.to_id
						LEFT JOIN user_master U2 ON U2.id = T1.from_id
						WHERE (T1.to_id = `+ data.from_user_id +` OR T1.from_id = `+ data.from_user_id  +` ) AND  (T1.to_id = `+ data.to_user_id +` OR T1.from_id = `+ data.to_user_id +`) ORDER BY T1.id DESC LIMIT 1`;
						
						return await functions.selectQuery(sql)
						.then((resp)=>{

							lastMsg = resp[0];
							
							USERS[data.to_user_id].emit("recivedMessage", lastMsg);

							return lastMsg;
						})
						
						
					} else {


						let sql = `SELECT T1.*,U1.first_name AS to_user_name, U2.first_name AS from_user_name,
						if(timestampdiff(YEAR,T1.created_at, now()) >= 1,CONCAT(timestampdiff(YEAR,T1.created_at, now()),' years'),IF(timestampdiff(MONTH,T1.created_at, now()) >=1, CONCAT(timestampdiff(MONTH,T1.created_at, now()),' month'),if(timestampdiff(DAY,T1.created_at, now()) >=1,if(timestampdiff(DAY,T1.created_at, now()) =1,CONCAT(timestampdiff(DAY,T1.created_at, now()),' day'),CONCAT(timestampdiff(DAY,T1.created_at, now()),' days')),if(timestampdiff(HOUR,T1.created_at, now())>=1,CONCAT(timestampdiff(HOUR,T1.created_at, now()),' hr'),CONCAT(timestampdiff(MINUTE,T1.created_at, now()),' min'))))) as ago,
						U1.image as to_user_image,U2.image as from_user_image FROM chat_master T1
						LEFT JOIN user_master U1 ON U1.id = T1.to_id
						LEFT JOIN user_master U2 ON U2.id = T1.from_id
						WHERE (T1.to_id = `+ data.from_user_id +` OR T1.from_id = `+ data.from_user_id  +` ) AND  (T1.to_id = `+ data.to_user_id +` OR T1.from_id = `+ data.to_user_id +`) ORDER BY T1.id DESC LIMIT 1`;
						
						return await functions.selectQuery(sql)
						.then((resp)=>{

							lastMsg = resp[0];
							
							//USERS[data.to_user_id].emit("recivedMessage", lastMsg);

							return lastMsg;
						})
					//	var token = [];
					//	token.push(data.to_user.fcm_token);
					//	let notimessage = 'Hai you have New message from '+data.from_user.user_name;
					//	user.sendPush(token,'Honu',notimessage,function(resp){
                           
                            // if(resp)
                            //     updateNotifications();
                       // })
					}
				}
			}
			var myfun = functions.insert('chat_master',mydata);
			myfun.then((response)=>{

				insertSuccess(response)
                .then((ackMsg)=>{

					callback(ackMsg);
				})
				
			})
			.catch((err)=>{
				console.log("error",err);
			});
			
			
		
			
		})	



		socket.on('sendAdminMessage',function(data,callback){
		
			var lastMsg = {};

			var mydata = {
				'message': data.msg,
				'from_id': data.from_user_id,
				'to_id': data.to_user_id,
				'created_at': data.date,
				'image_message':data.image_message
				
			}

			console.log("my data: ", mydata);
		
			// var updateNotifications = function(viewers){
            //     let notimessage = 'Hai you have New message from '+data.from_user.user_name;
            //     // for(let i=0;i<viewers.length;i++){
            //         var updateData = {
            //             receiver_id:data.to_user.user_id,
            //             sender_id:data.from_user.user_id,
            //             notify_time:moment(new Date).format('YYYY-MM-DD HH:mm:ss'),
            //             message:notimessage,
            //             status:'N'
            //         }
            //         functions.insert('notifications',updateData);
                   
            //     // }
            // }
			var insertSuccess = async function(response){
				if(response.insertId){
					if(USERS[data.to_user_id] != undefined && USERS[data.from_user_id] != undefined){
						
						let sql = `SELECT T1.*,U1.first_name AS to_user_name, U2.first_name AS from_user_name,
						if(timestampdiff(YEAR,T1.created_at, now()) >= 1,CONCAT(timestampdiff(YEAR,T1.created_at, now()),' years'),IF(timestampdiff(MONTH,T1.created_at, now()) >=1, CONCAT(timestampdiff(MONTH,T1.created_at, now()),' month'),if(timestampdiff(DAY,T1.created_at, now()) >=1,if(timestampdiff(DAY,T1.created_at, now()) =1,CONCAT(timestampdiff(DAY,T1.created_at, now()),' day'),CONCAT(timestampdiff(DAY,T1.created_at, now()),' days')),if(timestampdiff(HOUR,T1.created_at, now())>=1,CONCAT(timestampdiff(HOUR,T1.created_at, now()),' hr'),CONCAT(timestampdiff(MINUTE,T1.created_at, now()),' min'))))) as ago,
						U1.image as to_user_image,U2.image as from_user_image FROM admin_chat_master T1
						LEFT JOIN user_master U1 ON U1.id = T1.to_id
						LEFT JOIN user_master U2 ON U2.id = T1.from_id
						WHERE (T1.to_id = `+ data.from_user_id +` OR T1.from_id = `+ data.from_user_id  +` ) AND  (T1.to_id = `+ data.to_user_id +` OR T1.from_id = `+ data.to_user_id +`) ORDER BY T1.id DESC LIMIT 1`;
						
						return await functions.selectQuery(sql)
						.then((resp)=>{

							lastMsg = resp[0];
							
							USERS[data.to_user_id].emit("recivedMessage", lastMsg);

							return lastMsg;
						})
						
						
					} else {


						let sql = `SELECT T1.*,U1.first_name AS to_user_name, U2.first_name AS from_user_name,
						if(timestampdiff(YEAR,T1.created_at, now()) >= 1,CONCAT(timestampdiff(YEAR,T1.created_at, now()),' years'),IF(timestampdiff(MONTH,T1.created_at, now()) >=1, CONCAT(timestampdiff(MONTH,T1.created_at, now()),' month'),if(timestampdiff(DAY,T1.created_at, now()) >=1,if(timestampdiff(DAY,T1.created_at, now()) =1,CONCAT(timestampdiff(DAY,T1.created_at, now()),' day'),CONCAT(timestampdiff(DAY,T1.created_at, now()),' days')),if(timestampdiff(HOUR,T1.created_at, now())>=1,CONCAT(timestampdiff(HOUR,T1.created_at, now()),' hr'),CONCAT(timestampdiff(MINUTE,T1.created_at, now()),' min'))))) as ago,
						U1.image as to_user_image,U2.image as from_user_image FROM admin_chat_master T1
						LEFT JOIN user_master U1 ON U1.id = T1.to_id
						LEFT JOIN user_master U2 ON U2.id = T1.from_id
						WHERE (T1.to_id = `+ data.from_user_id +` OR T1.from_id = `+ data.from_user_id  +` ) AND  (T1.to_id = `+ data.to_user_id +` OR T1.from_id = `+ data.to_user_id +`) ORDER BY T1.id DESC LIMIT 1`;
						
						return await functions.selectQuery(sql)
						.then((resp)=>{

							lastMsg = resp[0];
							
							//USERS[data.to_user_id].emit("recivedMessage", lastMsg);

							return lastMsg;
						})
					//	var token = [];
					//	token.push(data.to_user.fcm_token);
					//	let notimessage = 'Hai you have New message from '+data.from_user.user_name;
					//	user.sendPush(token,'Honu',notimessage,function(resp){
                           
                            // if(resp)
                            //     updateNotifications();
                       // })
					}
				}
			}
			var myfun = functions.insert('admin_chat_master',mydata);
			myfun.then((response)=>{

				insertSuccess(response)
                .then((ackMsg)=>{

					callback(ackMsg);
				})
				
			})
			.catch((err)=>{
				console.log("error",err);
			});
			
			
		
			
		})	



		socket.on('logOut',function(logoutUser){
			//console.log('hereeeeeeeeee logout');
			io.emit("user_logedout", logoutUser);
		})

		// socket.on('loginSuceess',function(logoutUser){
		// 	console.log('hereeeeeeeeee login');
		// 	// io.emit("user_logedout", logoutUser);
		// })

		socket.on('disconnect', function () {

			/*var flag = 0; */

			if (USERS[socket.user_id] != undefined)
				delete USERS[socket.user_id];

			connections.splice(connections.indexOf(socket), 1);

			
			console.log("%d user(s) connected.", connections.length);
			
		})

	});
};