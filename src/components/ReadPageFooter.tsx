import { Link } from 'react-router-dom'
import { useLocaleStore } from '../store/locale'
import { focusElementWithoutAppScroll, scrollAppTo } from '../utils/appScroll'
import ReadContinue from './ReadContinue'
import { IconChevronUp } from './icons'

const COPY = {
  en: { label: 'Reading footer', tagline: 'Read. Reflect. Return.', saved: 'Saved passages', help: 'Help & support', top: 'Back to top' },
  pa: { label: 'ਪੜ੍ਹਨ ਦੇ ਪੰਨੇ ਦਾ ਅੰਤ', tagline: 'ਪੜ੍ਹੋ। ਵਿਚਾਰੋ। ਮੁੜ ਆਓ।', saved: 'ਸੰਭਾਲੇ ਪਾਠ', help: 'ਮਦਦ', top: 'ਉੱਪਰ ਜਾਓ' },
  hi: { label: 'पढ़ने के पृष्ठ का अंत', tagline: 'पढ़ें। विचारें। फिर लौटें।', saved: 'सहेजे हुए पाठ', help: 'सहायता', top: 'ऊपर जाएँ' },
}

export default function ReadPageFooter() {
  const locale = useLocaleStore(state => state.locale)
  const copy = COPY[locale]
  const backToTop = () => {
    const heading = document.getElementById('read-room-title')
    if (heading) focusElementWithoutAppScroll(heading)
    scrollAppTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return <footer className="read-page-footer" aria-label={copy.label} data-testid="read-page-footer" lang={locale}>
    <ReadContinue showEmpty={false} />
    <div className="read-page-footer__closing">
      <div className="read-page-footer__signature"><span lang="en">NaamRas</span><p>{copy.tagline}</p></div>
      <nav className="read-page-footer__links" aria-label={copy.label}>
        <Link to="/saved" className="interactive-focus">{copy.saved}</Link>
        <Link to="/support" className="interactive-focus">{copy.help}</Link>
        <button type="button" className="interactive-focus" onClick={backToTop}>{copy.top}<IconChevronUp size={16} /></button>
      </nav>
    </div>
  </footer>
}
