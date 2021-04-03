//Sheet Id
//https://docs.google.com/spreadsheets/d/1Za8jT8su5c5usc5gZhaKOaIiGs1MGmQtITfBs4aQqd0/edit#gid=0
//                                       ^------------------------------------------^
const sheetId = "1Za8jT8su5c5usc5gZhaKOaIiGs1MGmQtITfBs4aQqd0";
const credentials = require('./client-secrets.json');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const express = require("express");
const axios = require("axios");

const historyWinnerCol = 1;
const historyLoserCol = 6;

const DEBUG = true;

var doc = null;

var tableData = null;
var historyData = null;

var app = express();
app.use(express.json());

app.use(express.urlencoded({
  extended: true
}));
var port = process.env.PORT || 3000;
console.log("Loading Data");

app.listen(port, () => {
  console.log("Server running on port " + port);
});

app.use(express.static('content'));

app.get("/data", async (req, res, next) => {
  if (req.query.forced === "true" || doc == null) {
    tableData = null;
    await loadDocument();
  }
  try {
    if (tableData == null) {
      tableData = await getSpreadSheedData();
    }
    res.json(tableData);
  } catch (ex) {
    doc = null;
    res.sendStatus(500);
  }
});

app.get("/history", async (req, res, next) => {
  if (req.query.forced === "true" || doc == null) {
    historyData = null;
    await loadDocument();
  }
  if (!req.query.crew) {
    res.sendStatus(500);
  }
  var crew = req.query.crew;
  try {
    if (historyData == null) {
      historyData = await getSpreadSheedHistoryData();
    }
    var data = getHistoryByCrew(crew, historyData);
    res.json(data);
  } catch (ex) {
    doc = null;
    res.sendStatus(500);
  }
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
    doc = null;
    tableData = null;
    historyData = null;
    res.sendStatus(200);
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
    tableData = null;
    historyData = null;
    res.sendStatus(200);
  } catch (ex) {
    doc = null;
    res.sendStatus(500);
  }
});

async function loadDocument() {
  doc = new GoogleSpreadsheet(sheetId);

  doc.axios.interceptors.request.use((config) => {
    /** In dev, intercepts request and logs it into console for dev */
    if (DEBUG) { console.info("✉️ ", config); }
    return config;
  }, (error) => {
    if (DEBUG) { console.error("✉️ ", error); }
    return Promise.reject(error);
  });

  await doc.useServiceAccountAuth(credentials);
  await doc.loadInfo();
}

function getHistoryByCrew(crew, history) {
  var data = [];
  if (!history || !history.data) {
    return data;
  }
  for (var row of history.data) {
    if (row[historyWinnerCol] === crew || row[historyLoserCol] === crew) {
      data.push(row);
    }
  }
  return data;
}

async function getSpreadSheedHistoryData() {
  var sheet = await doc.sheetsByIndex[1];
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
    dataSet.data.push(dataRow);
  }
  return dataSet;
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
    dataRow.push(0);
    for (var colIndex = 0; colIndex < row._rawData.length; colIndex++) {
      dataRow.push(row._rawData[colIndex]);
    }
    if (dataRow[0] !== "") {
      dataSet.data.push(dataRow);
    }
  }
  return dataSet;
}