require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const Slack = require('slack');

const app = express();
const slack = new Slack();

const BuildMessage = require('./buildMessage');
const UNIPA = require('./unipa');
const Interpret = require('./interpret');
const Parse = require('./parse');
const Util = require('./util');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// const listener = app.listen(process.env.APP_PORT, () => {
//   console.log(`Server is listening on ${listener.address().port}`);
// });

// app.post("/", searchEmptyRoom);

async function searchEmptyRoom(req, res) {
  const inputParseRes = Parse.parseInputTime(req.body.text);
  if (!inputParseRes.success) {
    res.json(BuildMessage.errorMsg(inputParseRes.message));
    return;
  } else {
    res.json(BuildMessage.classRoomReserveStatusArgConfirm(inputParseRes.timeRange));
  }

  await UNIPA.dlClassRoomReserveStatus({
    building: inputParseRes.building
  });
  await Util.waitDownloadComplete(UNIPA.getDownloadPath());
  const interpretRes = await Interpret(UNIPA.getDownloadPath()).run(inputParseRes.timeRange);
  await UNIPA.tierDown();

  console.log(BuildMessage.classRoomReserveStatus(interpretRes.overlapReserved, interpretRes.emptyClasses));

  // slack.chat.postMessage({
  //   token: process.env.BOT_TOKEN, // ※Bot token 
  //   channel: req.body.channel_id,
  //   text: BuildMessage.classRoomReserveStatus(res.overlapReserved, res.emptyClasses),
  // }).then(console.log).catch(console.error);
}

module.exports = {searchEmptyRoom}