import type { HomeArtworkAsset } from '../utils/homeArtwork'
import nanakBalaMardana from '../assets/home-artwork/nanak-bala-mardana.jpg'
import nanakBalaMardanaThumb from '../assets/home-artwork/nanak-bala-mardana-thumb.jpg'
import nanakCompanions from '../assets/home-artwork/nanak-companions.jpg'
import nanakCompanionsThumb from '../assets/home-artwork/nanak-companions-thumb.jpg'
import goldenTemple from '../assets/home-artwork/golden-temple-carpenter.jpg'
import goldenTempleThumb from '../assets/home-artwork/golden-temple-carpenter-thumb.jpg'
import akalTakht from '../assets/home-artwork/akal-takht-simpson.jpg'
import akalTakhtThumb from '../assets/home-artwork/akal-takht-simpson-thumb.jpg'

export const homeArtworkAdditions: HomeArtworkAsset[] = [
  {
    id: 'nanak-bala-mardana', src: nanakBalaMardana, thumbnail: nanakBalaMardanaThumb,
    name: 'Beneath the canopy', description: 'A circa 1830 miniature of Guru Nanak with Bhai Mardana and Bhai Bala beneath a red canopy.',
    displayName: { en: 'Beneath the canopy', pa: 'ਛਤਰ ਦੀ ਛਾਂ ਹੇਠ', hi: 'छत्र की छाँव में' },
    localizedDescription: {
      en: 'A circa 1830 miniature of Guru Nanak with Bhai Mardana and Bhai Bala beneath a red canopy.',
      pa: 'ਲਗਭਗ 1830 ਦਾ ਲਘੂ ਚਿੱਤਰ: ਲਾਲ ਛਤਰ ਹੇਠ ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ, ਭਾਈ ਮਰਦਾਨਾ ਜੀ ਅਤੇ ਭਾਈ ਬਾਲਾ ਜੀ।',
      hi: 'लगभग 1830 का लघुचित्र: लाल छत्र के नीचे गुरु नानक देव जी, भाई मर्दाना जी और भाई बाला जी।',
    },
    width: 1100, height: 1467, mat: '#ede2dc', focalPosition: { x: .5, y: .5 },
    credit: { label: 'Wikimedia Commons · c. 1830', url: 'https://commons.wikimedia.org/wiki/File:Guru_Nanak_With_Mardana_and_Bala,_circa_1830.jpg' },
  },
  {
    id: 'nanak-companions', src: nanakCompanions, thumbnail: nanakCompanionsThumb,
    name: 'In the shade of the tree', description: 'An early nineteenth-century Punjab miniature of Guru Nanak seated with Bhai Mardana and Bhai Bala.',
    displayName: { en: 'In the shade of the tree', pa: 'ਰੁੱਖ ਦੀ ਛਾਂ ਹੇਠ', hi: 'वृक्ष की छाँव में' },
    localizedDescription: {
      en: 'An early nineteenth-century Punjab miniature of Guru Nanak seated with Bhai Mardana and Bhai Bala.',
      pa: 'ਉੱਨੀਵੀਂ ਸਦੀ ਦੇ ਸ਼ੁਰੂ ਦਾ ਪੰਜਾਬੀ ਲਘੂ ਚਿੱਤਰ: ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ ਨਾਲ ਭਾਈ ਮਰਦਾਨਾ ਜੀ ਅਤੇ ਭਾਈ ਬਾਲਾ ਜੀ।',
      hi: 'उन्नीसवीं सदी के आरंभ का पंजाबी लघुचित्र: गुरु नानक देव जी के साथ भाई मर्दाना जी और भाई बाला जी।',
    },
    width: 1100, height: 825, mat: '#e3e7de', focalPosition: { x: .5, y: .5 },
    credit: { label: 'Wikimedia Commons · Punjab', url: 'https://commons.wikimedia.org/wiki/File:Painting_of_Guru_Nanak_flanked_by_Bala_on_the_right_and_Mardana_on_the_left,_Punjab,_circa_early_19th_century.jpg' },
  },
  {
    id: 'golden-temple-carpenter', src: goldenTemple, thumbnail: goldenTempleThumb,
    name: 'The sarovar, 1854', description: 'William Carpenter’s 1854 watercolor of Harmandir Sahib reflected in the sarovar, with people gathered along the water.',
    displayName: { en: 'The sarovar, 1854', pa: 'ਸਰੋਵਰ, 1854', hi: 'सरोवर, 1854' },
    localizedDescription: {
      en: 'William Carpenter’s 1854 watercolor of Harmandir Sahib reflected in the sarovar, with people gathered along the water.',
      pa: 'ਵਿਲੀਅਮ ਕਾਰਪੈਂਟਰ ਦਾ 1854 ਦਾ ਜਲਰੰਗ ਚਿੱਤਰ: ਸਰੋਵਰ ਵਿੱਚ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦਾ ਪ੍ਰਤੀਬਿੰਬ ਅਤੇ ਕਿਨਾਰੇ ਉੱਤੇ ਲੋਕ।',
      hi: 'विलियम कारपेंटर का 1854 का जलरंग चित्र: सरोवर में हरिमंदर साहिब का प्रतिबिंब और किनारे पर लोग।',
    },
    width: 3400, height: 2290, mat: '#e3e7de', focalPosition: { x: .5, y: .5 },
    credit: { label: 'William Carpenter · 1854', url: 'https://commons.wikimedia.org/wiki/File:1854_Golden_temple_painting_by_William_Carpenter.jpg' },
  },
  {
    id: 'akal-takht-simpson', src: akalTakht, thumbnail: akalTakhtThumb,
    name: 'Akal Takht, 1864', description: 'William Simpson’s 1864 watercolor of Akal Takht and the surrounding courtyard, architecture and visitors.',
    displayName: { en: 'Akal Takht, 1864', pa: 'ਅਕਾਲ ਤਖ਼ਤ, 1864', hi: 'अकाल तख़्त, 1864' },
    localizedDescription: {
      en: 'William Simpson’s 1864 watercolor of Akal Takht and the surrounding courtyard, architecture and visitors.',
      pa: 'ਵਿਲੀਅਮ ਸਿੰਪਸਨ ਦਾ 1864 ਦਾ ਜਲਰੰਗ ਚਿੱਤਰ: ਅਕਾਲ ਤਖ਼ਤ, ਆਲੇ-ਦੁਆਲੇ ਦਾ ਵਿਹੜਾ, ਇਮਾਰਤਾਂ ਅਤੇ ਲੋਕ।',
      hi: 'विलियम सिम्पसन का 1864 का जलरंग चित्र: अकाल तख़्त, आसपास का प्रांगण, इमारतें और लोग।',
    },
    width: 2500, height: 1623, mat: '#eee4d2', focalPosition: { x: .5, y: .5 },
    credit: { label: 'William Simpson · 1864', url: 'https://commons.wikimedia.org/wiki/File:Watercolour_painting_titled_%27Akal_Boonga_(Akal_Bunga,_known_today_as_the_Akal_Takht)_at_the_Golden_temple._Umritsar_(Amritsar)._Punjaub_(Punjab)%27,_painted_in_1864_by_William_Simpson.jpg' },
  },
]
