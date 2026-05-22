export const DEFAULT_TIME_ZONE = "Asia/Shanghai";

export function previousDateString(baseDate = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = getDatePartsInTimeZone(baseDate, timeZone);
  const noonUtc = Date.UTC(parts.year, parts.month - 1, parts.day, 12);
  return formatDate(new Date(noonUtc - 24 * 60 * 60 * 1000), "UTC");
}

export function normalizeDateInput(value, baseDate = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  if (!value) throw new Error("日期不能为空，请使用 YYYY-MM-DD，例如 2026-05-19");

  const text = String(value).trim();
  const fullDate = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const monthDate = text.match(/^(\d{1,2})[-/.](\d{1,2})$/);

  let year;
  let month;
  let day;

  if (fullDate) {
    year = Number(fullDate[1]);
    month = Number(fullDate[2]);
    day = Number(fullDate[3]);
  } else if (monthDate) {
    year = getDatePartsInTimeZone(baseDate, timeZone).year;
    month = Number(monthDate[1]);
    day = Number(monthDate[2]);
  } else {
    throw new Error(`日期格式不正确：${value}。请使用 YYYY-MM-DD，例如 2026-05-19`);
  }

  assertValidDateParts(year, month, day, value);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function formatDisplayDate(dateString) {
  const { month, day } = parseDateStringParts(dateString);
  return `${pad(month)} ${pad(day)}`;
}

export function formatBatchTitle(dateString) {
  const { month, day } = parseDateStringParts(dateString);
  return `${pad(month)}${pad(day)} 投稿视频`;
}

export function formatDate(date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = timeZone === "UTC"
    ? {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate()
      }
    : getDatePartsInTimeZone(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function parseDateStringParts(dateString) {
  const match = String(dateString || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`日期必须是 YYYY-MM-DD：${dateString}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  assertValidDateParts(year, month, day, dateString);
  return { year, month, day };
}

export function compareDateStrings(left, right) {
  return String(left).localeCompare(String(right));
}

export function parsePublishedDateText(text, referenceDateString) {
  const normalized = String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";

  const reference = parseDateStringParts(referenceDateString);
  const prefix = "(?:发布时间|发布于|编辑于|发表于)?[:：]?\\s*";

  const fullDate = normalized.match(new RegExp(`${prefix}(20\\d{2})[./-](\\d{1,2})[./-](\\d{1,2})(?:\\s|$)`));
  if (fullDate) return formatDateParts(fullDate[1], fullDate[2], fullDate[3], text);

  const cnDate = normalized.match(new RegExp(`${prefix}(20\\d{2})年(\\d{1,2})月(\\d{1,2})日`));
  if (cnDate) return formatDateParts(cnDate[1], cnDate[2], cnDate[3], text);

  const cnMonthDate = normalized.match(new RegExp(`${prefix}(\\d{1,2})月(\\d{1,2})日`));
  if (cnMonthDate) return formatMonthDayNearReference(cnMonthDate[1], cnMonthDate[2], reference, referenceDateString, text);

  const monthDate = normalized.match(new RegExp(`${prefix}(\\d{1,2})[./-](\\d{1,2})(?:\\s+\\d{1,2}:?\\d{0,2})?(?:\\s|$)`));
  if (monthDate) return formatMonthDayNearReference(monthDate[1], monthDate[2], reference, referenceDateString, text);

  if (/今天|刚刚|\d+\s*分钟前|\d+\s*小时前/.test(normalized)) {
    return referenceDateString;
  }

  if (/昨天/.test(normalized)) {
    return addDaysToDateString(referenceDateString, -1);
  }

  const daysAgo = normalized.match(/(\d+)\s*天前/);
  if (daysAgo) {
    return addDaysToDateString(referenceDateString, -Number(daysAgo[1]));
  }

  const weeksAgo = normalized.match(/(\d+)\s*周前/);
  if (weeksAgo) {
    return addDaysToDateString(referenceDateString, -Number(weeksAgo[1]) * 7);
  }

  return "";
}

export function enumerateDateStrings(sinceDate, untilDate) {
  const since = parseDateStringParts(sinceDate);
  const until = parseDateStringParts(untilDate);
  const current = Date.UTC(since.year, since.month - 1, since.day, 12);
  const end = Date.UTC(until.year, until.month - 1, until.day, 12);
  if (current > end) throw new Error(`起始日期不能晚于结束日期：${sinceDate} > ${untilDate}`);

  const dates = [];
  for (let value = current; value <= end; value += 24 * 60 * 60 * 1000) {
    dates.push(formatDate(new Date(value), "UTC"));
  }
  return dates;
}

export function endExclusiveDateToInclusiveUntilDate(sinceDate, endExclusiveDate) {
  parseDateStringParts(sinceDate);
  parseDateStringParts(endExclusiveDate);
  if (compareDateStrings(sinceDate, endExclusiveDate) >= 0) {
    throw new Error(`结束日期必须晚于开始日期：${sinceDate} -> ${endExclusiveDate}`);
  }
  return addDaysToDateString(endExclusiveDate, -1);
}

export function enumerateHalfOpenDateStrings(sinceDate, endExclusiveDate) {
  return enumerateDateStrings(sinceDate, endExclusiveDateToInclusiveUntilDate(sinceDate, endExclusiveDate));
}

export function addDaysToDateString(dateString, days) {
  const { year, month, day } = parseDateStringParts(dateString);
  const noonUtc = Date.UTC(year, month - 1, day, 12);
  return formatDate(new Date(noonUtc + days * 24 * 60 * 60 * 1000), "UTC");
}

export function dateStringToDate(dateString) {
  const { year, month, day } = parseDateStringParts(dateString);
  return new Date(year, month - 1, day);
}

export function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateParts(yearValue, monthValue, dayValue, originalValue) {
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  assertValidDateParts(year, month, day, originalValue);
  return `${year}-${pad(month)}-${pad(day)}`;
}

function formatMonthDayNearReference(monthValue, dayValue, reference, referenceDateString, originalValue) {
  const currentYearDate = formatDateParts(reference.year, monthValue, dayValue, originalValue);
  if (compareDateStrings(currentYearDate, referenceDateString) <= 0) return currentYearDate;
  return formatDateParts(reference.year - 1, monthValue, dayValue, originalValue);
}

function getDatePartsInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day)
  };
}

function assertValidDateParts(year, month, day, originalValue) {
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new Error(`不是有效日期：${originalValue}`);
  }
}
