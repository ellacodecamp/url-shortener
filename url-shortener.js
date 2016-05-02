"use strict";

var express = require("express");
var mongoClient = require("mongodb").MongoClient;
var assert = require("assert");
var hashAlgorithm = require("non-crypto-hash").createHash("murmurhash3");
var validUrl = require("valid-url");
var url = require('url');
require("dotenv").load();

var mongoUrl = process.env.MONGO_URI;
var port = process.env.PORT || 8080;
var baseUrl = process.env.BASE_URL;
var db = null;
var collection = null;
var app = express();

mongoClient.connect(mongoUrl, function (err, database) {
  assert.equal(null, err);
  db = database;
  collection = db.collection("shorturl");
  app.listen(port,  function () {
    console.log("Node.js listening on port " + port + "...");
  });
});

var path = process.cwd();
app.use(express.static(path + "/public"));

function sendErrorResponse(res, err) {
  res.end(JSON.stringify({ "error": err }));
}

app.get("/new/*", function(req, res) {

  function validateUrl(inUrl) {
    if (!validUrl.isWebUri(inUrl)) {
      return false;
    }
    var urlParts = url.parse(inUrl);
    if (!urlParts.host.includes(".")) {
      return false;
    }
    return true;
  }

  var matchArray = req._parsedOriginalUrl.path.match(/^\/new\/(.*)$/);
  var inputUrl = matchArray[1];
  if (!validateUrl(inputUrl)) {
    sendErrorResponse(res, "URL Invalid");
    return;
  }

  var id = hashAlgorithm.x86Hash32(inputUrl).substr(0, 4);

  // use first 4 bytes for id
  // if duplicate id (but url is different), add sub-id (start with 1 and keep
  // incrementing it till we have unique id). Sub-id appends to id in form of
  // even number of digits hex number.

  function sendResponse() {
    res.end(JSON.stringify({ "original_url": inputUrl, "short_url": baseUrl + id }));
  }

  function insertResult(err, result) {
    if (err) {
      if (err.code == 11000) {
        collection.findOne({"_id": id, "url": inputUrl}, function (err, result) {
          if (err) {
            console.log("Error: " + err);
            sendErrorResponse(res, err.errmsg);
          }
          else if (result) {
            sendResponse();
          } else {
            // modify key and attempt to insert
            var baseId = id.substr(0, 4);
            var subId = id.substr(4);
            var subIdVal = 0;
            if (subId != "")
              subIdVal = parseInt(subId, 16);
            subIdVal++;
            subId = (subIdVal).toString(16);
            id = baseId + ((subId.length % 2 == 0)? "" : "0") + subId;
            collection.insertOne({ "_id": id, "url": inputUrl }, insertResult);
          }
        });
      } else {
        sendErrorResponse(res, err.errmsg);
      }
    } else {
      sendResponse();
    }
  }

  collection.insertOne({ "_id": id, "url": inputUrl }, insertResult);
});

app.get("/:id", function(req, res) {
  var id = req.params.id;
  collection.findOne({"_id": id }, function (err, result) {
    if (err) {
      console.log("Error: " + err);
      sendErrorResponse(res, err.errmsg);
    }
    else if (result) {
      res.redirect(result.url);
    } else {
      sendErrorResponse(res, "No original url found");
    }
  });
});
