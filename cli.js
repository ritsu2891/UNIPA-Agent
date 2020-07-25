require('dotenv').config();

const BuildMessage = require('./buildMessage');
const UNIPA = require('./unipa');
const Interpret = require('./interpret');
const Parse = require('./parse');
const Util = require('./util');

(async function () {
  let func = process.argv.slice(2,3);
  if (func.length > 0) func = func[0];
  switch (func) {
    case "unreadItems":
      const messages = await UNIPA.getUnreadBullteinBoardMessageItems();
      await UNIPA.tierDown();
      if (messages.length > 0) {
        console.log(`📜 未読の掲示が${messages.length}件あります。`);
        for (message of messages) {
          console.log(`・${message}`);
        }
        console.log("ℹ️ 上記メッセージはUNIPA上では既読として処理しました。");
      } else {
        console.log(`✅ 未読の掲示はありません。`);
      }
      break;
    case "emptyRooms":
      await UNIPA.getUnreadBullteinBoardMessageItems();
      const inputParseRes = Parse.parseInputTime(process.argv.slice(3).join(' '));
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
      break;
    default:
      break;
  }
})();