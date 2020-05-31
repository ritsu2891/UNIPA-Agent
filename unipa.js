const fs = require("fs");
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');
const { DateTime, Interval } = require('luxon');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const Util = require('./util');

dotenv.config();

const UNIPA_URL = "https://univ.aichi-pu.ac.jp/up/faces/login/Com00501A.jsp";
const UNIPA_ID = process.env.UNIPA_ID;
const UNIPA_PSWD = process.env.UNIPA_PSWD;

const TIMEOUT = 120000;

let downloadPath = null;

let browser = null;
let page = null;

function getDownloadPath() {
  return downloadPath;
}

async function init() {
  let uuid = null;
  while (!uuid || fs.existsSync(downloadPath)) {
    uuid = uuidv4();
  }
  downloadPath = path.join(process.env.DL_BASE_PATH, uuid);
  fs.mkdirSync(downloadPath);

  const width = 1200
  const height = 800
  
  browser = await puppeteer.launch({
    headless: true,
    "ignoreHTTPSErrors": false,
    executablePath: process.env.CHROME_EXEC_PATH,
    args: [
      `--window-size=${ width },${ height }`
    ],
  });
  page = (await browser.pages())[0];
  await page.setViewport({ width, height });
  await page._client.send('Page.setDownloadBehavior', {
    behavior : 'allow',
    downloadPath: downloadPath
  });
  await page.goto(UNIPA_URL);
}

async function tierDown() {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
  Util.cleanUp(downloadPath);
}

/* -----------
  ページ遷移
----------- */
async function loginUnipa() {
  await page.waitFor("#loginForm\\:userId", { timeout: TIMEOUT });
  await page.type("#loginForm\\:userId", UNIPA_ID);
  await page.type("#loginForm\\:password", UNIPA_PSWD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.click("#loginForm\\:loginButton")
  ]);

  const errMsgElem = await page.$("#errForm\\:gakuenException > * > * > * > *.ui-messages-error-detail");
  if (errMsgElem) {
    const unipaErrMsg = await errMsgElem.evaluate(node => node.innerText);
    throw new Error(`UNIPAからのエラーメッセージ: ${unipaErrMsg}`);
  }
}

async function mvToClassRoomReservePage() {
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.click("#menuForm\\:mainMenu > * > *:nth-child(7) > a")
  ]);
}

/* -----------
  アクション
----------- */
async function dlClassRoomReserveStatus(option) {
  option = Object.assign({
    building: 'H',
    startDateDt: DateTime.local(),
    endDateDt: DateTime.local(),
  }, option);

  const buildigItem = {
    'All': 1,
    'Satelite': 2,
    'B': 3,
    'C': 4,
    'StudentHall': 5,
    'E': 6,
    'F': 7,
    'G': 8,
    'H': 9,
    'AcademicAndCulturalExchangeCenter': 10,
    'Gym': 11,
    'Pool': 12,
    'Kyudo': 12,
    'Tennis': 13,
    'Ground': 14,
    'S': 15
  }

  if (!Object.keys(buildigItem).includes(option.building)) {
    option.building = 'H'
  }

  try {
    await init();
    await loginUnipa();
    await mvToClassRoomReservePage();

    page.waitFor(10);
    await page.type("#funcForm\\:targetDateFrom\\:targetDateFrom_input", "_" + option.startDateDt.toFormat("yyyy/MM/dd"), {delay: 10}); // 期間指定のはじめ
    await page.type("#funcForm\\:targetDateTo\\:targetDateTo_input", "_" + option.endDateDt.toFormat("yyyy/MM/dd"), {delay: 10}); // 期間指定のおわり
    await page.click("#funcForm\\:conditionArea > * > *:nth-child(4) > *"); // 「詳細項目」の押下
    await page.click("#funcForm\\:building > *:nth-child(4)"); // 「建物」コンボボックスの展開
    await page.click(`#funcForm\\:building_panel > * > * > *:nth-child(${buildigItem[option.building]})`) // 「建物」コンボボックスアイテムの選択
    await page.click("#funcForm\\:search"); //「検索」ボタン
    await Promise.race([ // 結果が壁画される (教室空き状況が返却される) まで待機
      page.waitForSelector("#funcForm\\:emptyMsg"),
      page.waitForSelector("#funcForm\\:yoyakuArea")
    ]);
    await page.waitForSelector("#j_idt30", {hidden: true}); // "Loading"表記が消えるまで待機 <これが表示されているときは「ダウンロード」ボタンが反応しない>
    await page.click("#funcForm\\:download"); //「ダウンロード」ボタン
    await page.waitForSelector("#yes", {visible: true}); //「はい」ボタンが押せるまで待機
    await page.click("#yes"); //「はい」ボタンを押す
  } catch (e) {
    console.log(e);
    tierDown();
  }
}

module.exports = {dlClassRoomReserveStatus, tierDown, getDownloadPath}