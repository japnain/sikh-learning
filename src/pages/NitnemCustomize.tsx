import '../styles/settings.css'
import NitnemCustomizePanel from '../components/NitnemCustomizePanel'
import { useLocaleStore } from '../store/locale'
import '../styles/nitnem-customize.css'

export default function NitnemCustomize() {
  const locale = useLocaleStore(state => state.locale)
  return (
    <div lang={locale === 'pa' ? 'pa-Guru' : locale === 'hi' ? 'hi' : 'en'} className="page-shell nitnem-customize-page" data-testid="page-nitnem-customize" data-page="nitnem-customize" data-ai-surface="nitnem-customize" data-ai-state="ready">
      <NitnemCustomizePanel />
    </div>
  )
}
