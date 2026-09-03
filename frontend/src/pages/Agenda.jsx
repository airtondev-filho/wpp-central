// ── Agenda.jsx ────────────────────────────────────────────────────────────────
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons'

const CALENDAR_ID = 'fce80dab230e4086601aae89048befd8552519030e39ccf12e636dc046345d97@group.calendar.google.com'

const EMBED_URL = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(CALENDAR_ID)}&ctz=America%2FSao_Paulo&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0`

export default function Agenda() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <h1 className="text-lg font-bold text-ink"><FontAwesomeIcon icon={faCalendarDays}/> Agenda</h1>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <iframe
          title="Google Agenda"
          src={EMBED_URL}
          className="w-full h-full rounded-xl border-0"
          style={{ border: '1px solid rgb(var(--ink-rgb) / 8%)' }}
        />
      </div>
    </div>
  )
}
