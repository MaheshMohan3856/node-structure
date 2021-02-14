let config = require('../server/config');

let pushers = {
	
	
	send_pushnotification: function (device_token, messages,type, data, count) {
        
		if (device_token != '') {
   
			var FCM = require('fcm-push');
			
			var fcm = new FCM(config.serverKey);
   
			   
			let message = {
				"to": device_token,
				"notification": { 
					"body": messages,
					"title": data.title,
					"type": type,
					// "click_action": "FCM_PLUGIN_ACTIVITY",
				},
				"data": {
					"custom_notification": {
						"body": messages,
						"type": type,
						"title": data.title,
						"push_data": data,
						"priority":"high",
						"show_in_foreground": true
					},
					channelId: "channel_id"
				}
			};
   
			fcm.send(message)
				.then(function (response) {
					console.log("Successfully sent with response: ", response);
				}).catch(function (err) {
					console.log("Something has gone wrong!");
					console.error(err);
					console.error("device_token: ", device_token);
				})
		} else {
			console.log("No device token");
		}
	 },

}

module.exports = pushers;