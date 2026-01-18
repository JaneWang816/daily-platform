import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays, isToday, isSameDay } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'Asia/Taipei'

export function getTaipeiNow(): Date {
  return toZonedTime(new Date(), TIMEZONE)
}

export function getTaipeiToday(): string {
  return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd')
}

export function formatDate(date: string | Date, formatStr: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr, { locale: zhTW })
}

export function formatDateDisplay(date: string | Date): string {
  return formatDate(date, 'M月d日 EEEE')
}

export {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  isToday,
  isSameDay,
  zhTW,
  toZonedTime,
  formatInTimeZone,
  TIMEZONE
}