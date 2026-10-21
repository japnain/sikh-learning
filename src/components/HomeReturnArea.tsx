import { Link } from 'react-router-dom'
import type { UiLocale } from '../types'
import { useLanguageStore } from '../store/language'
import { formatUiDate } from '../utils/formatUiDate'
import { buildReaderOriginNavigationState } from '../utils/libraryReaderNavigation'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { IconArrowRight, IconCheck } from './icons'
import '../styles/home-return-area.css'

export interface HomeSavedPreviewItem {
  id: string
  kind: 'passage' | 'vocab'
  label: string
  title: string
  detail: string
  path: string
  excerpt?: string
  isScripture?: boolean
  meaning?: string
  meaningLanguage?: 'en' | 'pa' | 'hi'
}

export interface HomePracticeSummary {
  tracking: boolean
  days: { date: string; completed: boolean; isToday: boolean; isFuture: boolean }[]
  completedDays: number
  weeklyGoal: number
  currentStreak: number
  bestStreak: number
}

interface HomeReturnAreaProps {
  locale: UiLocale
  savedItems: HomeSavedPreviewItem[]
  lastSavedNotice?: string | null
  practice: HomePracticeSummary
}

const COPY = {
  en: {
    week: 'This week', goal: 'Weekly goal', days: 'days', recorded: 'Practice recorded',
    todayRecorded: 'Today’s practice is recorded.', explanation: 'One completed bani records a day of practice.',
    streak: 'day streak', best: 'Best', saved: 'Saved for later', allSaved: 'Open saved items', all: 'View all',
    read: 'Return to reading', review: 'Review word', explore: 'Explore Gurbani', empty: 'Find a passage to return to.',
    names: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  },
  pa: {
    week: 'ਇਸ ਹਫ਼ਤੇ', goal: 'ਹਫ਼ਤਾਵਾਰੀ ਟੀਚਾ', days: 'ਦਿਨ', recorded: 'ਅਭਿਆਸ ਦਰਜ ਹੋਇਆ',
    todayRecorded: 'ਅੱਜ ਦਾ ਅਭਿਆਸ ਦਰਜ ਹੋ ਗਿਆ ਹੈ।', explanation: 'ਇੱਕ ਬਾਣੀ ਪੂਰੀ ਕਰਨ ਨਾਲ ਅਭਿਆਸ ਦਾ ਇੱਕ ਦਿਨ ਦਰਜ ਹੁੰਦਾ ਹੈ।',
    streak: 'ਦਿਨ ਲਗਾਤਾਰ', best: 'ਸਭ ਤੋਂ ਵੱਧ', saved: 'ਬਾਅਦ ਲਈ ਸੰਭਾਲਿਆ', allSaved: 'ਸੰਭਾਲੀਆਂ ਚੀਜ਼ਾਂ ਖੋਲ੍ਹੋ', all: 'ਸਭ ਵੇਖੋ',
    read: 'ਪਾਠ ਵੱਲ ਵਾਪਸ ਜਾਓ', review: 'ਸ਼ਬਦ ਦੁਹਰਾਓ', explore: 'ਗੁਰਬਾਣੀ ਖੋਜੋ', empty: 'ਮੁੜ ਪੜ੍ਹਨ ਲਈ ਪਾਠ ਲੱਭੋ।',
    names: ['ਸੋ', 'ਮੰ', 'ਬੁੱ', 'ਵੀ', 'ਸ਼ੁੱ', 'ਸ਼', 'ਐ'],
  },
  hi: {
    week: 'इस सप्ताह', goal: 'साप्ताहिक लक्ष्य', days: 'दिन', recorded: 'अभ्यास दर्ज हुआ',
    todayRecorded: 'आज का अभ्यास दर्ज हो गया है।', explanation: 'एक बाणी पूरी करने से अभ्यास का एक दिन दर्ज होता है।',
    streak: 'दिन लगातार', best: 'सर्वश्रेष्ठ', saved: 'बाद के लिए सहेजा', allSaved: 'सहेजी चीज़ें खोलें', all: 'सभी देखें',
    read: 'पाठ पर लौटें', review: 'शब्द दोहराएँ', explore: 'गुरबानी खोजें', empty: 'फिर पढ़ने के लिए कोई पाठ खोजें।',
    names: ['सो', 'मं', 'बु', 'गु', 'शु', 'श', 'र'],
  },
} as const

const hasGurmukhi = (value: string) => /[\u0A00-\u0A7F]/u.test(value)

function SavedReading({ item, locale, primary }: { item: HomeSavedPreviewItem; locale: UiLocale; primary: boolean }) {
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const copy = COPY[locale]
  const excerpt = item.excerpt?.trim()
  const text = excerpt || item.title
  const gurmukhi = hasGurmukhi(text)
  const textClass = gurmukhi ? getScriptTextFontClass(scriptMode) : ''
  const meaningGurmukhi = hasGurmukhi(item.meaning ?? '')
  const detailGurmukhi = hasGurmukhi(item.detail)
  return (
    <Link
      to={item.path}
      state={buildReaderOriginNavigationState(item.path, '/')}
      className={`home-return-reading${primary ? ' home-return-reading--primary' : ''}${item.kind === 'vocab' ? ' home-return-reading--word' : ''}`}
      data-testid={`home-saved-preview-${item.kind}`}
    >
      <span className="home-return-reading__label">{item.label}</span>
      <span className={`home-return-reading__text ${textClass}`} lang={gurmukhi ? getScriptTextLang(scriptMode) : undefined}>{gurmukhi ? renderScriptText(text, scriptMode) : text}</span>
      {item.meaning?.trim() ? <span className={`home-return-reading__meaning ${meaningGurmukhi ? getScriptTextFontClass(scriptMode) : ''}`} lang={meaningGurmukhi ? getScriptTextLang(scriptMode) : item.meaningLanguage}>{meaningGurmukhi ? renderScriptText(item.meaning, scriptMode) : item.meaning}</span> : null}
      <span className="home-return-reading__footer">
        <span className="home-return-reading__source">
          {excerpt && item.title !== excerpt ? <span>{item.title}</span> : null}
          {item.detail ? <span className={detailGurmukhi ? getScriptTextFontClass(scriptMode) : undefined} lang={detailGurmukhi ? getScriptTextLang(scriptMode) : undefined}>{detailGurmukhi ? renderScriptText(item.detail, scriptMode) : item.detail}</span> : null}
        </span>
        <span className="home-return-reading__open">{primary ? <span>{item.kind === 'vocab' ? copy.review : copy.read}</span> : null}<IconArrowRight size={18} /></span>
      </span>
    </Link>
  )
}

export default function HomeReturnArea({ locale, savedItems, lastSavedNotice, practice }: HomeReturnAreaProps) {
  const copy = COPY[locale]
  const primaryIndex = savedItems.findIndex(item => item.kind === 'passage' && item.excerpt?.trim())
  const ordered = primaryIndex > 0 ? [savedItems[primaryIndex], ...savedItems.filter((_, index) => index !== primaryIndex)] : savedItems
  const todayComplete = practice.days.some(day => day.isToday && day.completed)

  return (
    <div className="home-return-area">
      {practice.tracking ? (
        <section
          className="home-return-practice"
          aria-labelledby="home-return-week-title"
          data-testid="home-week"
          data-practice-state={practice.completedDays >= practice.weeklyGoal ? 'goal-met' : practice.completedDays ? 'in-progress' : 'empty'}
        >
          <div className="home-return-practice__heading">
            <h2 id="home-return-week-title">{copy.week}</h2>
            <Link to="/nitnem/customize#nitnem-continuity" aria-label={copy.goal}>
              <strong>{practice.completedDays} / {practice.weeklyGoal}</strong> {copy.days}
              <IconArrowRight size={16} className="home-return-practice__goal-arrow" />
            </Link>
          </div>
          <div className="home-return-practice__body">
            <ol className="home-return-days" aria-label={copy.week}>
              {practice.days.map((day, index) => (
                <li key={day.date} className={`${day.completed ? 'is-complete' : ''} ${day.isToday ? 'is-today' : ''} ${day.isFuture ? 'is-future' : ''}`}>
                  <span aria-hidden="true">{copy.names[index]}</span>
                  <time
                    dateTime={day.date}
                    aria-current={day.isToday ? 'date' : undefined}
                    aria-label={`${formatUiDate(locale, new Date(`${day.date}T12:00:00`))}${day.completed ? `: ${copy.recorded}` : ''}`}
                  >
                    {Number(day.date.slice(-2))}
                    {day.completed ? <span className="home-return-days__check" aria-hidden="true"><IconCheck size={9} /></span> : null}
                  </time>
                </li>
              ))}
            </ol>
            <div className="home-return-practice__note">
              {practice.currentStreak > 0 ? <p><strong>{practice.currentStreak} {copy.streak}</strong>{practice.bestStreak > practice.currentStreak ? <span>{copy.best}: {practice.bestStreak}</span> : null}</p> : null}
              <p>{todayComplete ? copy.todayRecorded : copy.explanation}</p>
            </div>
          </div>
        </section>
      ) : null}

      {ordered.length ? (
        <section className="home-return-saved" aria-labelledby="home-return-saved-title" data-testid="home-saved-overview">
          <div className="home-return-saved__heading"><h2 id="home-return-saved-title">{copy.saved}</h2><Link to="/saved" aria-label={copy.allSaved}>{copy.all}<IconArrowRight size={17} /></Link></div>
          {lastSavedNotice ? <p role="status" className="home-return-saved__notice">{lastSavedNotice}</p> : null}
          <div className="home-return-saved__readings" data-testid="home-saved-preview-list">
            {ordered.map((item, index) => <SavedReading key={`${item.kind}:${item.id}`} item={item} locale={locale} primary={index === 0} />)}
          </div>
        </section>
      ) : (
        <section className="home-return-explore" data-testid="home-saved-overview" aria-label={copy.saved}>
          {lastSavedNotice ? <p role="status" className="home-return-saved__notice">{lastSavedNotice}</p> : null}
          <div data-testid="home-saved-empty"><span>{copy.empty}</span><Link to="/banis">{copy.explore}<IconArrowRight size={17} /></Link></div>
        </section>
      )}
    </div>
  )
}
