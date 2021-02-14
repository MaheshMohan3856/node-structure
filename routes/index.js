var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/geo',function(req,res,next){
   console.log("reeeeqqqqqq",req.body);
   res.json({status:true});
})

module.exports = router;
