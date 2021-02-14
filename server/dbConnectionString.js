var dbConnectionString = {
	
	connection: {
		
		dev:{
			
			host: '10.10.11.254',
			
			user: 'smb',
			
			password: 'NewAgeSMb&#1',
			
			database: 'Hanu'
			
		},
		
		qa:{

			host: '192.169.197.111',

			user: 'newagesm_sme',

			password: 'KdUks.GbieWb',

			database: 'newagesm_swaye'

		},

		live:{

			host: '<IP ADDRESS OR HOSTNAME>',

			user: '<DB USER NAME>',

			password: '<DB PASSWORD>',

			database: '<DATABASE NAME>'

		}
	}
	
}

module.exports.dbConnectionString = dbConnectionString;