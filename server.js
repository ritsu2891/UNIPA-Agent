require('dotenv').config();

const fs = require("fs");
const execSync = require('child_process').execSync;
const XLSX = require("xlsx");
const Utils = XLSX.utils;
var express = require("express");
var bodyParser = require('body-parser');
var app = express();
const puppeteer = require('puppeteer');
var { DateTime, Interval } = require('luxon');

const Slack = require('slack');
const slack = new Slack();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var server = app.listen(3000, function(){
    console.log("Node.js is listening to PORT:" + server.address().port);
});
app.post("/drunipaers/", function(req, res, next) {
  (async () => {
    let resTexts = ["【試験運用中】 DR-UNIPA-ERS", "(c) 2019 dev.rpaka"];

    const inputParse = parseInputTime(req.body.text);
    if (!inputParse.success) {
      resTexts.push("⚠️エラー");
      resTexts.push(inputParse.message);
    } else {
      resTexts.push(`🕒設定時刻: ${inputParse.itvl.toFormat("HH:mm")}`);
      resTexts.push("🔹UNIPAから情報取得中です... しばらくお待ちください💭");
    }

    res.json({
      "response_type": "in_channel",
      "text": resTexts.join('\n')
    });

    if (inputParse.success) {
      await downloadDataZip();
      const rt = await run(inputParse.itvl);
      slack.chat.postMessage({
        token: process.env.BOT_TOKEN, // ※Bot token 
        channel: req.body.channel_id,
        text: rt,
      }).then(console.log).catch(console.error);
    }
  })();
});

function parseInputTime(text) {
  words = text.split(' ');
  if (words.length != 2) {
    return {
      success: false,
      message: '> 開始時刻と終了時刻の2つだけを入力して下さい🙄'
    };
  }

  let dtInvalid = [];

  try {
    const startDt = DateTime.fromFormat(words[0], "HH:mm");
    const endDt = DateTime.fromFormat(words[1], "HH:mm");
    
    if (startDt.invalid) {
      dtInvalid.push("> 開始時刻が不正です🕒");
    }
    if (endDt.invalid) {
      dtInvalid.push("> 終了時刻が不正です🕒");
    }
    if (dtInvalid.length > 0) {
      return {
        success: false,
        message: dtInvalid.join('\n')
      };
    }

    const requestItvl = Interval.fromDateTimes(startDt, endDt);

    if (requestItvl.invalid) {
      return {
        success: false,
        message: "> 開始時刻と終了時刻の順番がおかしいようです🧐"
      }
    }

    return {
      success: true,
      itvl: requestItvl
    }
  } catch (e) {
    console.log(e);
  }

}

const UNIPA_URL = "https://univ.aichi-pu.ac.jp/up/faces/login/Com00501A.jsp";
const UNIPA_ID = process.env.UNIPA_ID;
const UNIPA_PSWD = process.env.UNIPA_PSWD;

const TIMEOUT = 120000;

async function downloadDataZip () {
  const browser = await puppeteer.launch({
    headless: true,
    "ignoreHTTPSErrors": false,
    // executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
    executablePath: '/usr/bin/google-chrome',
    // "slowMo": 200,
  });

  const downloadPath = './Download';

  const page = await browser.newPage();

  await page._client.send('Page.setDownloadBehavior', {
    behavior : 'allow',
    downloadPath: downloadPath
  });

  await page.goto(UNIPA_URL);

  await page.waitFor("#loginForm\\:userId", { timeout: TIMEOUT });
  await page.type("#loginForm\\:userId", UNIPA_ID);
  await page.type("#loginForm\\:password", UNIPA_PSWD);

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.click("#loginForm\\:loginButton")
  ]);

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.click("#menuForm\\:mainMenu > * > *:nth-child(7) > a")
  ]);
  // --- 教室予約画面
  todayDt = DateTime.local().toFormat("yyyy/MM/dd");
  page.waitFor(1000);
  console.log(1);
  await page.type("#funcForm\\:targetDateFrom\\:targetDateFrom_input", "_" + todayDt, {delay: 100});
  console.log(2);
  await page.type("#funcForm\\:targetDateTo\\:targetDateTo_input", "_" + todayDt, {delay: 100});
  console.log(3);
  await page.click("#funcForm\\:conditionArea > * > *:nth-child(4) > *");
  console.log(4);
  await page.click("#funcForm\\:building > *:nth-child(4)");
  console.log(5);
  await page.waitFor(1000);
  // await page.screenshot({path: '5.png'});
  // await page.click("#funcForm\\:building_panel > * > * > *:nth-child(9)");
  console.log(6);
  await page.waitFor(300);
  await page.click("#funcForm\\:search");
  console.log(7);
  await page.waitFor(3000);
  await page.click("#funcForm\\:download");
  console.log(8);
  await page.waitFor(300);
  await page.click("#yes");

  console.log(9);
  await waitDownloadComplete(downloadPath).catch((err) => console.error(err));

  browser.close();
}

const waitDownloadComplete = async (path, waitTimeSpanMs = 1000, timeoutMs = 60 * 1000) => {
  return new Promise((resolve, reject) => {

    const wait = (waitTimeSpanMs, totalWaitTimeMs) => setTimeout(
      () => isDownloadComplete(path).then(
        (completed) => {
          if (completed) { 
            resolve();
          } else {

            const nextTotalTime = totalWaitTimeMs + waitTimeSpanMs;
            if (nextTotalTime >= timeoutMs) {
              reject('timeout');
            }

            const nextSpan = Math.min(
              waitTimeSpanMs,
              timeoutMs - nextTotalTime
            );
            wait(nextSpan, nextTotalTime);
          }           
        }
      ).catch(
        (err) => { reject(err); }
      ),
      waitTimeSpanMs
    );
    
    wait(waitTimeSpanMs, 0);
  }); 
}

const isDownloadComplete = async (path) => {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      if (err) {
        reject(err);
      } else {
        if (files.length === 0) {
          resolve(false);
          return;
        }
        for(let file of files){

          // .crdownloadがあればダウンロード中のものがある
          if (/.*\.crdownload$/.test(file)) { 
            resolve(false);
            return;
          }
        }
        resolve(true);
      }
    });
  });
}

async function run(requestItvl) {
  const zip = await searchFiles("zip");
  execSync(`unzip -o ./Download/${zip} -d Download`);

  // requestItvl = Interval.fromDateTimes(
  //   DateTime.fromFormat("1745", "hhmm"),
  //   DateTime.fromFormat("1800", "hhmm"),
  // )

  const reservations = {};

  const sheetFiles = await searchFiles("xlsx");

  sheetFiles.forEach(function (file) {
    const book = XLSX.readFile("./Download/" + file);
    const sheet = book.Sheets["Sheet0"];
    const range = Utils.decode_range(sheet["!ref"]);
  
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const data = {
        reserveId: sheet[Utils.encode_cell({ r: row, c: 0 })].v,
        className: sheet[Utils.encode_cell({ r: row, c: 2 })].v,
        itvl: Interval.fromDateTimes(
          DateTime.fromFormat(sheet[Utils.encode_cell({ r: row, c: 7 })].v, "hhmm"),
          DateTime.fromFormat(sheet[Utils.encode_cell({ r: row, c: 8 })].v, "hhmm"),
        ),
        detail: sheet[Utils.encode_cell({ r: row, c: 10 })].v,
      };
  
      if (!reservations[data.className]) {
        reservations[data.className] = [];
      }
  
      if (data.reserveId != '-') {
        reservations[data.className].push(data);
      }
    }
  });

  overlapReserved = [];
  emptyClasses = [];

  Object.keys(reservations).forEach(function (className) {
    if (reservations[className].length == 0) {
      emptyClasses.push(className);
    } else {
      let overlapReserveCount = 0;

      reservations[className].forEach((reserve) => {
        if (reserve.itvl.overlaps(requestItvl)) {
          overlapReserved.push(reserve);
          overlapReserveCount++;
        }
      })

      if (overlapReserveCount == 0) {
        emptyClasses.push(className);
      }
    }
  });

  let resTexts = [];

  resTexts.push("❌重複している予約: ");
  overlapReserved.forEach((reserve) => {
    resTexts.push(reserve.className + " - " + reserve.detail + " (" + reserve.itvl.s.toFormat("HH:mm") + "〜" + reserve.itvl.e.toFormat("HH:mm") + ")");
  });
  if (overlapReserved.length == 0) {
    resTexts.push("* ありません");
  }

  resTexts.push("\n❇️空いている教室: ");
  resTexts.push(emptyClasses.join(", "));
  if (emptyClasses.length == 0) {
    resTexts.push("* ありません");
  }

  zip.forEach(file => {
    fs.unlink('./Download/' + file, (err) => {
      if (err) throw err;
    });
  });

  sheetFiles.forEach(file => {
    fs.unlink('./Download/' + file, (err) => {
      if (err) throw err;
    });
  });

  console.log(' 🎉 ');
  return resTexts.join("\n");
}

function searchFiles(ext) {
  return new Promise((resolve, reject) => {
    fs.readdir('./Download', function (err, files) {
      if (err) throw err;
      const matcher = new RegExp(".+\." + ext);
      files = files.filter(file => matcher.exec(file) != null);
      resolve(files);
    });
  }); 
}