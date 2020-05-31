require('dotenv').config();

const BuildMessage = require('./buildMessage');
const UNIPA = require('./unipa');
const Interpret = require('./interpret');
const Parse = require('./parse');
const Util = require('./util');

(async function () {
  const inputParseRes = Parse.parseInputTime(process.argv.slice(2).join(' '));
  if (!inputParseRes.success) {
    console.log(BuildMessage.errorMsg(inputParseRes.message).text);
    return;
  } else {
    console.log(BuildMessage.classRoomReserveStatusArgConfirm(inputParseRes.timeRange).text);
  }

  await UNIPA.dlClassRoomReserveStatus({
    building: inputParseRes.building,
    startDateDt: inputParseRes.timeRange.s,
    endDateDt: inputParseRes.timeRange.e
  });
  await Util.waitDownloadComplete(UNIPA.getDownloadPath());
  const interpretRes = await Interpret(UNIPA.getDownloadPath()).run(inputParseRes.timeRange);
  await UNIPA.tierDown();

  console.log(BuildMessage.classRoomReserveStatus(interpretRes.overlapReserved, interpretRes.emptyClasses));
})();