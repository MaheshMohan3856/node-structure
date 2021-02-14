let config = require('../server/config'), 
    functions = require('./functions'),
    stripe = require('stripe')(config.stripe_key);


var stripeFunctions = {
   
   createCustomer(email){
    return new Promise((resolve, reject) => {
      stripe.customers.create({
         email: email
      },function(err, customer) {
            if(err){
                reject(err);
            }else{
                resolve(customer);
                        
            }
      });
    })
     
   },

   createAccountToken(userDet,acctDet){

      return new Promise((resolve,reject)=>{
         stripe.tokens.create({
            account : {
               business_type: 'individual',
               
               individual:{
                  first_name:userDet.first_name,
                  last_name:userDet.last_name,
                  address:{
                     city:acctDet.city,
                     country:"US",
                     line1:acctDet.address,
                     postal_code:acctDet.zip,
                     state:acctDet.state 
                  },
                  dob:{ day: acctDet.day, month:  acctDet.month, year: acctDet.year  },
                  email:userDet.email,
                  ssn_last_4:acctDet.ssn_number,
                  gender:null,
                  metadata:{},
                  phone:'6589456235',
                  verification:{
                     document:{
                        back:null,
                        front:null
                     }
                  }
               },
               tos_shown_and_accepted: true
            }
         },function(err, token) {
            if(err){
               
              reject(err);
            }else{
             
               resolve(token);
            }
                      
         })
      })

   },

   createAccount(userDet,acctDet,bank_token){
    return new Promise((resolve, reject) => {
      stripe.accounts.create({
        type: 'custom',
        country: 'US',
        email: userDet.email,
        account_token: bank_token,
        business_profile: {
         mcc:'5734',
         url:'https://honu.com',
         product_description:'To learn swimming' 
        },
        requested_capabilities: ['card_payments'],
      
        external_account: { 
            object: "bank_account",
            account_number: acctDet.account_number, 
            country: "US",
            currency: "USD",
            routing_number: acctDet.routing_number
         },

      }, function(err, account) {
           if(err){
            
             reject(err);
           }else{
             
              resolve(account);
                     
           }
      });
    })
   },
   
   


   payAmount(stripeDet){
   
    return new Promise((resolve, reject) => {
         stripe.charges.create({
            customer:stripeDet.customer_id,
            amount : stripeDet.cost,
            currency : "usd",
            source : stripeDet.card_token,
            application_fee : stripeDet.admin_com,
            destination : stripeDet.bank_account
          }, function(err,charge) {
             if(err) reject(err);
             else resolve(charge);
          });
    })
   
   },

   createCard(customer_id,token){

      return new Promise((resolve, reject) => {
         stripe.customers.createSource(customer_id,{
            source:token
          }, function(err,created) {
             if(err) reject({"status":false,"err":err});
             else resolve({"status":true,"created":created});
          });
    })
   },

   getAllCards(customer_id){

      return new Promise((resolve,reject)=>{
        
         stripe.customers.listSources(customer_id,function(err,cards){
           
            if(err) reject({"status":false,"err":err});
            else resolve({"status":true,"cards":cards.data});
         })
      })
   },


   refundAmount(transaction_id,refund_application_fee){
        
      return new Promise((resolve,reject)=>{
         stripe.refunds.create({
            charge: transaction_id,
            refund_application_fee: refund_application_fee,
            reverse_transfer:true

          }, function(err, refund) {
            if(err) reject(err);
             else resolve(refund);
          });
      })
   },

   deleteAccount(account_id){

      return new Promise((resolve,reject)=>{
         stripe.accounts.del(account_id,function(err, account){
            if(err) reject(err);
            else resolve(account);
         })
      })

   },

   deleteCard(stripe_id,cardToken){

      return new Promise((resolve,reject)=>{
         stripe.customers.deleteSource(
            stripe_id,
            cardToken,
            function(err, confirmation) {
               if(err) reject(err);
               else resolve(confirmation);
            }
         )
      })
   }




}

module.exports = stripeFunctions;
