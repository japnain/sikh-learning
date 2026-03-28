import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomTextsStore } from '../store/customTexts'
import { SCRIPTURES } from '../data'

export default function AddText() {
  const navigate = useNavigate()
  const { customTexts, addText } = useCustomTextsStore()
  const [gurmukhi, setGurmukhi] = useState('')
  const [transliteration, setTransliteration] = useState('')
  const [translation_en, setTranslationEn] = useState('')
  const [translation_pa, setTranslationPa] = useState('')
  const [scripture, setScripture] = useState(SCRIPTURES[0].shortName)
  const [customScripture, setCustomScripture] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  const existingCustomScriptures = Array.from(
    new Set(customTexts.map(t => t.scripture.toUpperCase().trim()))
  ).filter(name => !SCRIPTURES.some(s => s.shortName === name))

  const finalScripture = useCustom
    ? customScripture.toUpperCase().trim()
    : scripture

  const handleSave = () => {
    if (!gurmukhi.trim()) return
    addText({ gurmukhi, transliteration, translation_en, translation_pa, scripture: finalScripture })
    navigate('/library')
  }

  return (
    <div className="p-4 max-w-md mx-auto mt-4">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 mr-3 min-h-[44px] min-w-[44px]">←</button>
        <h1 className="text-white font-semibold text-lg">Add Text</h1>
      </div>

      <div className="mb-4">
        <label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Scripture</label>
        <select
          value={useCustom ? '__custom__' : scripture}
          onChange={e => {
            if (e.target.value === '__custom__') { setUseCustom(true) }
            else { setUseCustom(false); setScripture(e.target.value) }
          }}
          className="w-full bg-[#1A1A1A] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C9A84C] min-h-[44px]"
        >
          {SCRIPTURES.map(s => <option key={s.id} value={s.shortName}>{s.name}</option>)}
          {existingCustomScriptures.map(name => <option key={name} value={name}>{name}</option>)}
          <option value="__custom__">+ New Book...</option>
        </select>
        {useCustom && (
          <input
            autoFocus
            placeholder="Enter scripture name"
            value={customScripture}
            onChange={e => setCustomScripture(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#C9A84C] rounded-xl px-4 py-3 text-white text-sm mt-2 focus:outline-none min-h-[44px]"
          />
        )}
      </div>

      {[
        { label: 'Gurmukhi Text *', value: gurmukhi, set: setGurmukhi, lang: 'pa-Guru' as const, placeholder: 'Paste Gurmukhi here...' },
        { label: 'Transliteration', value: transliteration, set: setTransliteration, placeholder: 'e.g. Sat Sri Akaal...' },
        { label: 'English Translation', value: translation_en, set: setTranslationEn, placeholder: 'English meaning...' },
        { label: 'Punjabi Translation', value: translation_pa, set: setTranslationPa, lang: 'pa-Guru' as const, placeholder: 'ਪੰਜਾਬੀ ਅਰਥ...' },
      ].map(field => (
        <div key={field.label} className="mb-4">
          <label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">{field.label}</label>
          <textarea
            lang={field.lang}
            placeholder={field.placeholder}
            value={field.value}
            onChange={e => field.set(e.target.value)}
            className={`w-full bg-[#1A1A1A] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C9A84C] resize-none min-h-[80px] ${field.lang === 'pa-Guru' ? 'font-gurmukhi' : ''}`}
            style={field.lang === 'pa-Guru' ? { fontSize: '18px' } : undefined}
          />
        </div>
      ))}

      <p className="text-gray-600 text-xs mb-4">Note: Word-level definitions are available for curated library content only.</p>

      <button
        onClick={handleSave}
        disabled={!gurmukhi.trim() || (useCustom && !customScripture.trim())}
        className="w-full py-4 bg-[#C9A84C] text-black font-semibold rounded-2xl text-sm disabled:opacity-40 min-h-[44px]"
      >
        Save to Library
      </button>
    </div>
  )
}
