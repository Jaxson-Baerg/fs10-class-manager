const express = require('express');
const router = express.Router();
const chalk = require('chalk');

require('dotenv').config();

const { getClasses } = require('../db/queries/classQueries');

// Escape special characters so a value is valid inside an ICS text field
const escapeIcsText = (text) => `${text}`
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

// Class events allow HTML (see b9f8a77), so strip tags and decode the common
// entities before the value goes into a plain-text ICS field
const plainText = (text) => `${text}`
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim();

// Format a timestamp as an ICS floating time in fixed Mountain wall time, e.g.
// 20221115T160000. Times are emitted without a zone (no "Z" and no TZID) on
// purpose: subscribing calendars such as Google Calendar convert absolute
// times to the subscriber's timezone, which applies DST and renders a 4pm
// class as 5pm during former DST months. Floating times display the wall time
// as written in every calendar.
const icsDateTime = (timestamp) => {
  // fixed Mountain time is UTC-7 all year; shift the instant into MST wall time
  const date = new Date(new Date(timestamp).getTime() - 7 * 3600 * 1000);
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
};

// RFC 5545 limits lines to 75 octets; fold longer lines with CRLF + a leading space
const foldIcsLine = (line) => {
  if (line.length <= 74) return line;
  const chunks = [];
  for (let i = 0; i < line.length; i += 74) chunks.push(line.slice(i, i + 74));
  return chunks.join('\r\n ');
};

// Calendar feed of all classes (past and upcoming) that can be subscribed to
// from an external calendar such as Google Calendar. Events are emitted as
// fixed Mountain floating times so every subscriber sees the same wall time.
router.get('/', async (req, res) => {
  try {
    const classes = await getClasses(); // ordered by start_datetime
    const calendarName = `${process.env.COMPANY || 'FS10'} classes`;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//fs10//ClassManager//EN',
      'CALSCALE:GREGORIAN',
      `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
      'X-PUBLISHED-TTL:PT1H'
    ];

    const dtstamp = `${icsDateTime(new Date())}Z`; // DTSTAMP must be UTC

    classes.forEach(c => {
      lines.push(
        'BEGIN:VEVENT',
        `UID:class-${c.class_id}@fortysix10fitness.ca`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${icsDateTime(c.start_datetime)}`,
        `DTEND:${icsDateTime(c.end_datetime)}`,
        `SUMMARY:${escapeIcsText(plainText(c.name))}`,
        `DESCRIPTION:${escapeIcsText(plainText(c.description || ''))}`,
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');

    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.send(lines.map(foldIcsLine).join('\r\n') + '\r\n');
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;