function errorMsg(message) {
  return inChannelMsg([
    "⚠️ エラー",
    message
  ].join('\n'));
}

function classRoomReserveStatusArgConfirm(timeRange) {
  return inChannelMsg([
    `🕒設定時刻: ${timeRange.toFormat("yy/MM/dd HH:mm")}`,
    "🔹UNIPAから情報取得中です... しばらくお待ちください💭"
  ].join('\n'));
}

function classRoomReserveStatus(overlapReserved, emptyClasses) {
  let resTexts = [];

  resTexts.push("❌ 重複している予約");

  overlapReserved.forEach((reserve) => {
    resTexts.push(`- ${reserve.className} : ${reserve.detail} (${reserve.timeRange.s.toFormat("MM/dd HH:mm")} - ${reserve.timeRange.e.toFormat("MM/dd HH:mm")})`);
  });

  if (overlapReserved.length == 0) {
    resTexts.push("- ありません");
  }

  resTexts.push("🈳 空いている教室");
  if (emptyClasses.length == 0) {
    resTexts.push("- ありません");
  } else {
    resTexts.push(emptyClasses.join(", "));
  }

  return resTexts.join("\n");
}

function inChannelMsg(text) {
  return {
    "response_type": "in_channel",
    "text": text
  };
}

module.exports = {errorMsg, classRoomReserveStatus, classRoomReserveStatusArgConfirm}