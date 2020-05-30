const XLSX = require("xlsx");
const Utils = XLSX.utils;
const path = require("path");
var { DateTime, Interval } = require('luxon');

const { unarchive, searchFiles, margeLuxonDateTimeObject } = require('./util');

let downloadPath = '';

async function run(requestTimeRange) {
  if (!requestTimeRange) {
    return;
  }

  if (!(await unarchive(downloadPath))) {
    return;
  }

  const reservations = {};
  const sheetFiles = await searchFiles(downloadPath, "xlsx");

  sheetFiles.forEach(function (file) {
    const book = XLSX.readFile(path.join(downloadPath, file));
    const sheet = book.Sheets["Sheet0"];
    const range = Utils.decode_range(sheet['!ref']);
  
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const dateDt = DateTime.fromFormat(sheet[Utils.encode_cell({ r: row, c: 5 })].v, "y/MM/dd");

      const data = {
        reserveId: sheet[Utils.encode_cell({ r: row, c: 0 })].v,
        className: sheet[Utils.encode_cell({ r: row, c: 2 })].v,
        date: dateDt,
        timeRange: Interval.fromDateTimes(
          margeLuxonDateTimeObject(dateDt, DateTime.fromFormat(sheet[Utils.encode_cell({ r: row, c: 7 })].v, "hhmm")),
          margeLuxonDateTimeObject(dateDt, DateTime.fromFormat(sheet[Utils.encode_cell({ r: row, c: 8 })].v, "hhmm")),
        ),
        category: sheet[Utils.encode_cell({ r: row, c: 9 })].v,
        detail: sheet[Utils.encode_cell({ r: row, c: 10 })].v,
        teacher: sheet[Utils.encode_cell({ r: row, c: 12 })].v,
      };

      if (data.detail == '') {
        data.detail = `<${data.category}>`;
      }
  
      if (!reservations[data.className]) {
        reservations[data.className] = [];
      }
  
      if (true /*data.reserveId != '-'*/) {
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
        if (reserve.timeRange.overlaps(requestTimeRange)) {
          overlapReserved.push(reserve);
          overlapReserveCount++;
        }
      })

      if (overlapReserveCount == 0) {
        emptyClasses.push(className);
      }
    }
  });

  return {
    overlapReserved,
    emptyClasses
  }
}

module.exports = (path) => {
  downloadPath = path;
  return {
    run
  }
}