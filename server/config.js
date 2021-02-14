var fs = require('fs'),

//parseString = require('xml2js').parseString,

Q = require('q'),

deffered = Q.defer(),

configData = {

    secret: 'newage2win',

    encrypt_algorithm: 'aes-256-cbc',

    encrypt_pass: 'newagesmb',

    site_url: 'http://10.10.10.89:3005/uploads/',

    google_key: 'AIzaSyA0Dm7UfoRoks7bDrRjvApVOLABdGAWaww',//AIzaSyDUUKDZKQSGbzZrevrHk6y4oZ0NFRBbRhE

    google_url: 'https://maps.googleapis.com/maps/api/',

    upload_url: 'public/uploads/',

   // stripe_key:'sk_test_2WAn5l5TV7xEfh2IG9E5jQub',

    stripe_key:'sk_test_uCiJ6dsVKLUJ66Mm5Q0jCixc002wxHsqNL',

    server_key:'',

    email_header: `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hanu</title>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        </head>
        <body>`,

    email_footer: `
        <p>Thanks,</p>
        <p>Honu Team</p>
        </body></html>`,
    
        // getConfig: function () {
        //     return new Promise((resolve, reject) => {
        //         let data = fs.readFileSync('config.xml');
        //         parseString(data, (err, result) => {
        //             if (err) { reject(err); throw err; }
        //             resolve(result.preferences);
        //         });
        //     })
        // }
}

module.exports = configData;