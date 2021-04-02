//Sheet Id
//https://docs.google.com/spreadsheets/d/1Za8jT8su5c5usc5gZhaKOaIiGs1MGmQtITfBs4aQqd0/edit#gid=0
//                                       ^------------------------------------------^
const sheetId = "1Za8jT8su5c5usc5gZhaKOaIiGs1MGmQtITfBs4aQqd0";
const credentials = require('./client-secrets.json');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const express = require("express");
const rankingRow = 1;
var doc = null;
var app = express();
app.use(express.json());


var ADMIN_signature = "282a2202bb6a31eb327a71c1affc9648";

app.use(express.urlencoded({
  extended: true
}));
var port = process.env.PORT || 3000;
console.log("Loading Data");
app.listen(port, () => {
  console.log("Server running on port " + port);
});


app.use(express.static('content'));
app.get("/rankrTable", async (req, res, next) => {
  if (req.query.forced === "true" || doc == null) {
    await loadDocument();
  }
  try {
    var data = await getSpreadSheedData();
    res.json(data);
  } catch (ex) {
    doc = null;
    res.sendStatus(500);
  }
});
app.get("/authorize", async (req, res, next) => {
  if (isAuthorised(req)) {
    return true;
  }
  return false;
});
app.get("/datasource", async (req, res, next) => {
  if (isAuthorised(req)) {
    return "https://docs.google.com/spreadsheets/d/" + sheetId + "/edit#gid=0";
  }
  return "";
});
app.post("/match", async (req, res, next) => {
  if (doc == null) {
    await loadDocument();
  }
  var data = req.body;
  var historySheet = await doc.sheetsByIndex[1];
  var row = {
    "Date": data.matchDate,
    "Winner": data.winnerTeam,
    "WinnerELO": data.winnerTeamELO,
    "WinnerRank": data.winnerTeamRank,
    "WinnerIncrease": data.winnerTeamIncrease,
    "WinnnerUpset": data.winnerTeamUpset,
    "Loser": data.loserTeam,
    "LoserELO": data.loaseTeamELO,
    "LoserRank": data.loserTeamRank,
    "StockDiff": data.stockDiff
  }
  var rows = [];
  rows.push(row);

  try {
    await historySheet.addRows(rows);
  } catch (ex) {
    doc = null;
    res.sendStatus(500);
  }
});

app.post("/crew", async (req, res, next) => {
  if (doc == null) {
    await loadDocument();
  }
  var data = req.body;
  var rankSheet = await doc.sheetsByIndex[0];
  var row = {
    "#": "_",
    "Tag": data.crewTag.toUpperCase(),
    "Crew": data.crewName,
  }
  var rows = [];
  rows.push(row);

  try {
    await rankSheet.addRows(rows);
  } catch (ex) {
    doc = null;
    res.sendStatus(500);
  }
});

function isAuthorised(request) {
  if (req.query.token === "282a2202bb6a31eb327a71c1affc9648") {
    return true;
  }
  return false;
}

async function loadDocument() {
  doc = new GoogleSpreadsheet(sheetId);
  await doc.useServiceAccountAuth(credentials);
  await doc.loadInfo();
}

async function getSpreadSheedData() {
  var sheet = await doc.sheetsByIndex[0];
  var rows = await sheet.getRows();
  var dataSet = {
    data: []
  };
  for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    var dataRow = [];
    var row = rows[rowIndex];
    for (var colIndex = 0; colIndex < row._rawData.length; colIndex++) {
      dataRow.push(row._rawData[colIndex]);
    }
    if (dataRow[0] !== "") {
      var num = parseInt(dataRow[0]);
      if (!isNaN(num)){
        dataRow[0]=num;
      }else{
        dataRow[0]=99999;
      }
      dataSet.data.push(dataRow);
    }
  }
  return dataSet;
}