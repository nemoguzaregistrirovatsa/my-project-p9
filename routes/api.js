/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
var mongoose = require('mongoose');
var xhr = require('xmlhttprequest').XMLHttpRequest;


module.exports = function (app) {

  mongoose.connect(process.env.DB, { useNewUrlParser: true });
  
  var SchemaP9 = new mongoose.Schema({
    stockData: {
      stock: String,
      price: String
    },
    likes: Number,
    likesIp: [String]
  });
  var ModelP9 = mongoose.model('ModelP9', SchemaP9);
  
  /*ModelP9.remove({}, (err, data) => {
    if (err) console.log('Error deleting from database!')
  });*/
  
  app.route('/api/stock-prices')
    .get(function (req, res){
    console.log(req.query)
          var stock = [];
          if (!Array.isArray(req.query.stock)) stock.push(req.query.stock)
          else stock = req.query.stock;
          var response = [];

          function nextFunc() {
            if (response.length == 1) {
              res.json(response[0])
            } else if (response.length == 2 && response[0] != 'Unknown symbol!' && response[1] != 'Unknown symbol!') {
              res.json({
                stockData: [
                  {
                    stock: response[0].stockData.stock,
                    price: response[0].stockData.price,
                    rel_likes: response[0].stockData.likes - response[1].stockData.likes
                  },
                  {
                    stock: response[1].stockData.stock,
                    price: response[1].stockData.price,
                    rel_likes: response[1].stockData.likes - response[0].stockData.likes
                  }
                ]
              });
            } else if (response[0] == 'Unknown symbol!' || response[1] == 'Unknown symbol!') {
              res.send('Unknown symbol!')
            };
          };
    
          stock.forEach((item, i) => {
            
                var request = new xhr();
                request.open("GET",'https://cloud.iexapis.com/stable/stock/' + item + '/quote?token=' + process.env.TOKEN,true);
                request.send();
                request.onload=function(){

                      if (request.responseText != 'Unknown symbol') {
                        var json=JSON.parse(request.responseText);
                        var stockData = {stockData: {stock: json.symbol, price: json.latestPrice.toString()}};

                            ModelP9.findOne(stockData, (err, data) => {
                              if (err) {
                                console.log('Error reading database!');
                              } else if (!data) {
                                data = new ModelP9(stockData);
                                data.likes = 0;
                                data.likesIp = [];
                              };
                              if (req.query.like) {
                                var hasIp = data.likesIp.map((item) => {
                                  return item == req.connection.remoteAddress;
                                });
                                if (!hasIp[0]) {
                                  data.likes++;
                                  data.likesIp.push(req.connection.remoteAddress);
                                };
                              };
                              data.save((err, data) => {
                                if (err) {
                                  console.log('Error saving to database!');
                                } else {
                                  response.push({stockData: {stock: data.stockData.stock, price: data.stockData.price, likes: data.likes}});
                                  if (response[stock.length - 1]) nextFunc();
                                }
                              });
                            });

                      } else {
                        response.push('Unknown symbol!');
                        if (response[stock.length - 1]) nextFunc();
                      };

                } //xhr()

          }); //forEach()
            
          //} //func()

    }); //get()
    
};
