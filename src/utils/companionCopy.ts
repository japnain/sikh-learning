import type { UiLocale } from '../types'
import { useLocaleStore } from '../store/locale'

const translations: Record<string, readonly [string, string]> = {
  "{current} of {total}": ["{total} ਵਿੱਚੋਂ {current}", "{total} में से {current}"],
  "{current} of {total} matches": ["ਮੇਲ {total} ਵਿੱਚੋਂ {current}", "परिणाम {total} में से {current}"],
  "Showing {visible} of {total} sections": ["{total} ਭਾਗਾਂ ਵਿੱਚੋਂ {visible} ਦਿਖਾਏ ਜਾ ਰਹੇ ਹਨ", "{total} भागों में से {visible} दिखाए जा रहे हैं"],
  "Open AK Page {page} item {item} in Study": ["ਅਧਿਐਨ ਵਿੱਚ ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ ਪੰਨਾ {page}, ਸ਼ਬਦ {item} ਖੋਲ੍ਹੋ", "अध्ययन में अमृत कीर्तन पृष्ठ {page}, शबद {item} खोलें"],
  "Breadcrumb": [
    "ਪੰਨੇ ਦਾ ਰਾਹ",
    "पृष्ठ का रास्ता"
  ],
  "Read": [
    "ਪੜ੍ਹੋ",
    "पढ़ें"
  ],
  "Rehat": [
    "ਰਹਿਤ",
    "रहत"
  ],
  "Amrit Keertan": [
    "ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ",
    "अमृत कीर्तन"
  ],
  "Read Directory": [
    "ਪਾਠ ਸੂਚੀ",
    "पाठ सूची"
  ],
  "Chapter": [
    "ਅਧਿਆਇ",
    "अध्याय"
  ],
  "chapters": [
    "ਅਧਿਆਇ",
    "अध्याय"
  ],
  "rehats": [
    "ਰਹਿਤਾਂ",
    "रहत स्रोत"
  ],
  "words": [
    "ਸ਼ਬਦ",
    "शब्द"
  ],
  "Section": [
    "ਭਾਗ",
    "भाग"
  ],
  "sections": [
    "ਭਾਗ",
    "भाग"
  ],
  "shabads": [
    "ਸ਼ਬਦ",
    "शबद"
  ],
  "matching": [
    "ਮੇਲ",
    "मिलते परिणाम"
  ],
  "of": [
    "ਵਿੱਚੋਂ",
    "में से"
  ],
  "matches": [
    "ਮੇਲ",
    "मिलते परिणाम"
  ],
  "Showing": [
    "ਦਿਖਾਏ ਜਾ ਰਹੇ ਹਨ",
    "दिखाए जा रहे हैं"
  ],
  "Item": [
    "ਸ਼ਬਦ",
    "शबद"
  ],
  "Line": [
    "ਪੰਕਤੀ",
    "पंक्ति"
  ],
  "Shabad": [
    "ਸ਼ਬਦ",
    "शबद"
  ],
  "unknown": [
    "ਅਣਜਾਣ",
    "अज्ञात"
  ],
  "Open": [
    "ਖੋਲ੍ਹੋ",
    "खोलें"
  ],
  "Retry": [
    "ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    "फिर कोशिश करें"
  ],
  "English": [
    "ਅੰਗਰੇਜ਼ੀ",
    "अंग्रेज़ी"
  ],
  "On": [
    "ਚਾਲੂ",
    "चालू"
  ],
  "Off": [
    "ਬੰਦ",
    "बंद"
  ],
  "Previous section": [
    "ਪਿਛਲਾ ਭਾਗ",
    "पिछला भाग"
  ],
  "Next section": [
    "ਅਗਲਾ ਭਾਗ",
    "अगला भाग"
  ],
  "Start of source": [
    "ਸਰੋਤ ਦੀ ਸ਼ੁਰੂਆਤ",
    "स्रोत की शुरुआत"
  ],
  "End of source": [
    "ਸਰੋਤ ਦਾ ਅੰਤ",
    "स्रोत का अंत"
  ],
  "Rehat section navigation": [
    "ਰਹਿਤ ਦੇ ਭਾਗਾਂ ਵਿੱਚ ਜਾਓ",
    "रहत के भागों में जाएँ"
  ],
  "Continue reading": [
    "ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ",
    "पढ़ना जारी रखें"
  ],
  "Move section by section without returning to the chapter list.": [
    "ਅਧਿਆਇ ਸੂਚੀ ਤੇ ਵਾਪਸ ਗਏ ਬਿਨਾਂ ਅਗਲਾ ਭਾਗ ਪੜ੍ਹੋ।",
    "अध्याय सूची पर लौटे बिना अगला भाग पढ़ें।"
  ],
  "Back to all sections": [
    "ਸਾਰੇ ਭਾਗਾਂ ਤੇ ਵਾਪਸ",
    "सभी भागों पर वापस"
  ],
  "Search rehats": [
    "ਰਹਿਤਾਂ ਲੱਭੋ",
    "रहत स्रोत खोजें"
  ],
  "Search rehats...": [
    "ਰਹਿਤਾਂ ਲੱਭੋ…",
    "रहत स्रोत खोजें…"
  ],
  "Search inside this Rehat chapter": [
    "ਇਸ ਰਹਿਤ ਅਧਿਆਇ ਵਿੱਚ ਲੱਭੋ",
    "इस रहत अध्याय में खोजें"
  ],
  "Search inside this chapter...": [
    "ਇਸ ਅਧਿਆਇ ਵਿੱਚ ਲੱਭੋ…",
    "इस अध्याय में खोजें…"
  ],
  "Search Rehat chapters": [
    "ਰਹਿਤ ਦੇ ਅਧਿਆਇ ਲੱਭੋ",
    "रहत के अध्याय खोजें"
  ],
  "Search chapters...": [
    "ਅਧਿਆਇ ਲੱਭੋ…",
    "अध्याय खोजें…"
  ],
  "This Rehat route is not valid.": [
    "ਇਹ ਰਹਿਤ ਲਿੰਕ ਸਹੀ ਨਹੀਂ ਹੈ।",
    "यह रहत लिंक सही नहीं है।"
  ],
  "Back to Rehat": [
    "ਰਹਿਤ ਤੇ ਵਾਪਸ",
    "रहत पर वापस"
  ],
  "Loading chapter...": [
    "ਅਧਿਆਇ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…",
    "अध्याय लोड हो रहा है…"
  ],
  "This Rehat chapter could not be loaded right now.": [
    "ਇਹ ਰਹਿਤ ਅਧਿਆਇ ਇਸ ਵੇਲੇ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕਿਆ।",
    "यह रहत अध्याय अभी लोड नहीं हो सका।"
  ],
  "Back to chapters": [
    "ਅਧਿਆਇਆਂ ਤੇ ਵਾਪਸ",
    "अध्यायों पर वापस"
  ],
  "Rehat Chapter": [
    "ਰਹਿਤ ਅਧਿਆਇ",
    "रहत अध्याय"
  ],
  "No matching text found in this chapter.": [
    "ਇਸ ਅਧਿਆਇ ਵਿੱਚ ਮੇਲ ਖਾਂਦੀ ਲਿਖਤ ਨਹੀਂ ਮਿਲੀ।",
    "इस अध्याय में मिलती पाठ नहीं मिली।"
  ],
  "Previous match": [
    "ਪਿਛਲਾ ਮੇਲ",
    "पिछला परिणाम"
  ],
  "Next match": [
    "ਅਗਲਾ ਮੇਲ",
    "अगला परिणाम"
  ],
  "Clear find": [
    "ਖੋਜ ਸਾਫ਼ ਕਰੋ",
    "खोज साफ करें"
  ],
  "Back to rehats": [
    "ਰਹਿਤਾਂ ਤੇ ਵਾਪਸ",
    "रहत स्रोतों पर वापस"
  ],
  "Loading chapters...": [
    "ਅਧਿਆਇ ਲੋਡ ਹੋ ਰਹੇ ਹਨ…",
    "अध्याय लोड हो रहे हैं…"
  ],
  "Rehat chapters could not load right now.": [
    "ਰਹਿਤ ਦੇ ਅਧਿਆਇ ਇਸ ਵੇਲੇ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕੇ।",
    "रहत के अध्याय अभी लोड नहीं हो सके।"
  ],
  "No chapters match this search yet.": [
    "ਇਸ ਖੋਜ ਨਾਲ ਕੋਈ ਅਧਿਆਇ ਨਹੀਂ ਮਿਲਿਆ।",
    "इस खोज से कोई अध्याय नहीं मिला।"
  ],
  "Loading rehats...": [
    "ਰਹਿਤਾਂ ਲੋਡ ਹੋ ਰਹੀਆਂ ਹਨ…",
    "रहत स्रोत लोड हो रहे हैं…"
  ],
  "Rehat could not load right now.": [
    "ਰਹਿਤ ਇਸ ਵੇਲੇ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕੀ।",
    "रहत अभी लोड नहीं हो सकी।"
  ],
  "No rehats match this search yet.": [
    "ਇਸ ਖੋਜ ਨਾਲ ਕੋਈ ਰਹਿਤ ਨਹੀਂ ਮਿਲੀ।",
    "इस खोज से कोई रहत स्रोत नहीं मिला।"
  ],
  "SGPC source": [
    "ਸ਼੍ਰੋਮਣੀ ਕਮੇਟੀ ਦਾ ਸਰੋਤ",
    "शिरोमणि कमेटी का स्रोत"
  ],
  "1936 draft approvals": [
    "1936 ਦੇ ਖਰੜੇ ਦੀਆਂ ਪ੍ਰਵਾਨਗੀਆਂ",
    "1936 के मसौदे की स्वीकृतियाँ"
  ],
  "1945 additions and deletions": [
    "1945 ਦੇ ਵਾਧੇ ਤੇ ਘਾਟੇ",
    "1945 के जोड़ और हटाव"
  ],
  "SGPC English PDF": [
    "ਸ਼੍ਰੋਮਣੀ ਕਮੇਟੀ ਦੀ ਅੰਗਰੇਜ਼ੀ ਪੀਡੀਐਫ਼",
    "शिरोमणि कमेटी की अंग्रेज़ी पीडीएफ़"
  ],
  "Rehat source": [
    "ਰਹਿਤ ਸਰੋਤ",
    "रहत स्रोत"
  ],
  "Chapter reader": [
    "ਅਧਿਆਇ ਪਾਠਕ",
    "अध्याय पाठक"
  ],
  "Read this Rehat source chapter by chapter, with search kept close to the list and the text.": [
    "ਇਸ ਰਹਿਤ ਸਰੋਤ ਨੂੰ ਅਧਿਆਇ ਅਨੁਸਾਰ ਪੜ੍ਹੋ ਅਤੇ ਸੂਚੀ ਜਾਂ ਲਿਖਤ ਵਿੱਚ ਲੱਭੋ।",
    "इस रहत स्रोत को अध्याय अनुसार पढ़ें और सूची या पाठ में खोजें।"
  ],
  "The SGPC-published Sikh Rehit Maryada is presented here as a formal code of Sikh living, with its draft approvals and 1945 revisions kept source-backed.": [
    "ਸ਼੍ਰੋਮਣੀ ਕਮੇਟੀ ਵੱਲੋਂ ਪ੍ਰਕਾਸ਼ਿਤ ਸਿੱਖ ਰਹਿਤ ਮਰਯਾਦਾ ਇੱਥੇ ਸਿੱਖ ਜੀਵਨ ਦੇ ਵਿਧਾਨ ਵਜੋਂ ਪੇਸ਼ ਹੈ। ਖਰੜੇ ਦੀਆਂ ਪ੍ਰਵਾਨਗੀਆਂ ਅਤੇ 1945 ਦੀਆਂ ਸੋਧਾਂ ਲਈ ਸਰੋਤ ਦਿੱਤਾ ਗਿਆ ਹੈ।",
    "शिरोमणि कमेटी द्वारा प्रकाशित सिख रहत मर्यादा यहाँ सिख जीवन के विधान के रूप में प्रस्तुत है। मसौदे की स्वीकृतियों और 1945 के संशोधनों का स्रोत दिया गया है।"
  ],
  "The SGPC English source records draft approval by the All-India Sikh Mission Board on 1 August 1936 and by the SGPC on 12 October 1936. It also records Religious Advisory Committee discussion on 7 January 1945 and SGPC approval of additions and deletions on 3 February 1945.": [
    "ਸ਼੍ਰੋਮਣੀ ਕਮੇਟੀ ਦੇ ਅੰਗਰੇਜ਼ੀ ਸਰੋਤ ਅਨੁਸਾਰ ਆਲ ਇੰਡੀਆ ਸਿੱਖ ਮਿਸ਼ਨ ਬੋਰਡ ਨੇ 1 ਅਗਸਤ 1936 ਅਤੇ ਸ਼੍ਰੋਮਣੀ ਕਮੇਟੀ ਨੇ 12 ਅਕਤੂਬਰ 1936 ਨੂੰ ਖਰੜੇ ਨੂੰ ਪ੍ਰਵਾਨ ਕੀਤਾ। ਧਾਰਮਿਕ ਸਲਾਹਕਾਰ ਕਮੇਟੀ ਨੇ 7 ਜਨਵਰੀ 1945 ਨੂੰ ਵਿਚਾਰ ਕੀਤਾ ਅਤੇ 3 ਫ਼ਰਵਰੀ 1945 ਨੂੰ ਸ਼੍ਰੋਮਣੀ ਕਮੇਟੀ ਨੇ ਵਾਧੇ ਤੇ ਘਾਟੇ ਪ੍ਰਵਾਨ ਕੀਤੇ।",
    "शिरोमणि कमेटी के अंग्रेज़ी स्रोत के अनुसार ऑल इंडिया सिख मिशन बोर्ड ने 1 अगस्त 1936 और शिरोमणि कमेटी ने 12 अक्टूबर 1936 को मसौदा स्वीकार किया। धार्मिक सलाहकार समिति ने 7 जनवरी 1945 को चर्चा की और 3 फ़रवरी 1945 को शिरोमणि कमेटी ने जोड़ और हटाव स्वीकार किए।"
  ],
  "Chapter text is supplied by BaniDB. Historical notes are included where references are available.": [
    "ਅਧਿਆਇ ਦੀ ਲਿਖਤ ਬਾਣੀਡੀਬੀ ਤੋਂ ਮਿਲਦੀ ਹੈ। ਜਿੱਥੇ ਹਵਾਲੇ ਉਪਲਬਧ ਹਨ, ਉੱਥੇ ਇਤਿਹਾਸਕ ਜਾਣਕਾਰੀ ਦਿੱਤੀ ਗਈ ਹੈ।",
    "अध्याय की पाठ बाणी डीबी से मिलती है। जहाँ संदर्भ उपलब्ध हैं, वहाँ ऐतिहासिक जानकारी दी गई है।"
  ],
  "Book order": [
    "ਕਿਤਾਬ ਦਾ ਕ੍ਰਮ",
    "पुस्तक का क्रम"
  ],
  "Amrit Keertan index": [
    "ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ ਸੂਚੀ",
    "अमृत कीर्तन सूची"
  ],
  "Source Ang": [
    "ਸਰੋਤ ਅੰਗ",
    "स्रोत अंग"
  ],
  "Where it appears": [
    "ਸਰੋਤ ਵਿੱਚ ਥਾਂ",
    "स्रोत में स्थान"
  ],
  "Raag": [
    "ਰਾਗ",
    "राग"
  ],
  "Musical grouping": [
    "ਰਾਗ ਅਨੁਸਾਰ",
    "राग अनुसार"
  ],
  "Writer": [
    "ਰਚਨਾਕਾਰ",
    "रचनाकार"
  ],
  "Author metadata": [
    "ਰਚਨਾਕਾਰ ਦੀ ਜਾਣਕਾਰੀ",
    "रचनाकार की जानकारी"
  ],
  "SGGS Ang": [
    "ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਅੰਗ",
    "श्री गुरु ग्रंथ साहिब अंग"
  ],
  "DG Ang": [
    "ਦਸਮ ਗ੍ਰੰਥ ਅੰਗ",
    "दसम ग्रंथ अंग"
  ],
  "Ang": [
    "ਅੰਗ",
    "अंग"
  ],
  "AK Page": [
    "ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ ਪੰਨਾ",
    "अमृत कीर्तन पृष्ठ"
  ],
  "AK Pages": [
    "ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ ਪੰਨੇ",
    "अमृत कीर्तन पृष्ठ"
  ],
  "Search this section by shabad, source, raag, writer, English, or ang...": [
    "ਇਸ ਭਾਗ ਵਿੱਚ ਸ਼ਬਦ, ਸਰੋਤ, ਰਾਗ, ਰਚਨਾਕਾਰ, ਅੰਗਰੇਜ਼ੀ ਜਾਂ ਅੰਗ ਨਾਲ ਲੱਭੋ…",
    "इस भाग में शबद, स्रोत, राग, रचनाकार, अंग्रेज़ी या अंग से खोजें…"
  ],
  "Search Amrit Keertan sections...": [
    "ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ ਦੇ ਭਾਗ ਲੱਭੋ…",
    "अमृत कीर्तन के भाग खोजें…"
  ],
  "Search this Amrit Keertan section": [
    "ਇਸ ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ ਭਾਗ ਵਿੱਚ ਲੱਭੋ",
    "इस अमृत कीर्तन भाग में खोजें"
  ],
  "Search Amrit Keertan sections": [
    "ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ ਦੇ ਭਾਗ ਲੱਭੋ",
    "अमृत कीर्तन के भाग खोजें"
  ],
  "Browse Amrit Keertan by section, search within each set of shabads, and open the full shabad in the Study reader with source metadata intact.": [
    "ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ ਦੇ ਭਾਗ ਵੇਖੋ, ਸ਼ਬਦਾਂ ਵਿੱਚ ਲੱਭੋ ਅਤੇ ਸਰੋਤ ਦੀ ਜਾਣਕਾਰੀ ਨਾਲ ਪੂਰਾ ਸ਼ਬਦ ਅਧਿਐਨ ਪਾਠਕ ਵਿੱਚ ਖੋਲ੍ਹੋ।",
    "अमृत कीर्तन के भाग देखें, शबदों में खोजें और स्रोत की जानकारी के साथ पूरा शबद अध्ययन पाठक में खोलें।"
  ],
  "Keertan Section": [
    "ਕੀਰਤਨ ਭਾਗ",
    "कीर्तन भाग"
  ],
  "Ordered by the Amrit Keertan book index. SGGS Ang, source, raag, and writer show where each shabad comes from.": [
    "ਕ੍ਰਮ ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ ਦੀ ਸੂਚੀ ਅਨੁਸਾਰ ਹੈ। ਅੰਗ, ਸਰੋਤ, ਰਾਗ ਅਤੇ ਰਚਨਾਕਾਰ ਹਰ ਸ਼ਬਦ ਦਾ ਹਵਾਲਾ ਦਿੰਦੇ ਹਨ।",
    "क्रम अमृत कीर्तन की सूची अनुसार है। अंग, स्रोत, राग और रचनाकार हर शबद का संदर्भ देते हैं।"
  ],
  "View order": [
    "ਦਿਖਾਉਣ ਦਾ ਕ੍ਰਮ",
    "दिखाने का क्रम"
  ],
  "Keep book order as the default, or compare by source metadata.": [
    "ਕਿਤਾਬ ਦਾ ਕ੍ਰਮ ਰੱਖੋ ਜਾਂ ਸਰੋਤ ਦੀ ਜਾਣਕਾਰੀ ਅਨੁਸਾਰ ਵੇਖੋ।",
    "पुस्तक का क्रम रखें या स्रोत की जानकारी के अनुसार देखें।"
  ],
  "This section could not load right now.": [
    "ਇਹ ਭਾਗ ਇਸ ਵੇਲੇ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕਿਆ।",
    "यह भाग अभी लोड नहीं हो सका।"
  ],
  "Loading shabads...": [
    "ਸ਼ਬਦ ਲੋਡ ਹੋ ਰਹੇ ਹਨ…",
    "शबद लोड हो रहे हैं…"
  ],
  "No shabads match this search yet.": [
    "ਇਸ ਖੋਜ ਨਾਲ ਕੋਈ ਸ਼ਬਦ ਨਹੀਂ ਮਿਲਿਆ।",
    "इस खोज से कोई शबद नहीं मिला।"
  ],
  "Hide source details": [
    "ਸਰੋਤ ਦਾ ਵੇਰਵਾ ਲੁਕਾਓ",
    "स्रोत का विवरण छिपाएँ"
  ],
  "Show source details": [
    "ਸਰੋਤ ਦਾ ਵੇਰਵਾ ਵੇਖੋ",
    "स्रोत का विवरण देखें"
  ],
  "Loading section...": [
    "ਭਾਗ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…",
    "भाग लोड हो रहा है…"
  ],
  "Amrit Keertan could not load right now.": [
    "ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ ਇਸ ਵੇਲੇ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕਿਆ।",
    "अमृत कीर्तन अभी लोड नहीं हो सका।"
  ],
  "This Amrit Keertan section was not found.": [
    "ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ ਦਾ ਇਹ ਭਾਗ ਨਹੀਂ ਮਿਲਿਆ।",
    "अमृत कीर्तन का यह भाग नहीं मिला।"
  ],
  "Back to Amrit Keertan": [
    "ਅੰਮ੍ਰਿਤ ਕੀਰਤਨ ਤੇ ਵਾਪਸ",
    "अमृत कीर्तन पर वापस"
  ],
  "Loading sections...": [
    "ਭਾਗ ਲੋਡ ਹੋ ਰਹੇ ਹਨ…",
    "भाग लोड हो रहे हैं…"
  ],
  "No sections match this search yet.": [
    "ਇਸ ਖੋਜ ਨਾਲ ਕੋਈ ਭਾਗ ਨਹੀਂ ਮਿਲਿਆ।",
    "इस खोज से कोई भाग नहीं मिला।"
  ],
  "Show more sections": [
    "ਹੋਰ ਭਾਗ ਵੇਖੋ",
    "और भाग देखें"
  ],
  "in Study": [
    "ਅਧਿਐਨ ਵਿੱਚ",
    "अध्ययन में"
  ]
}

export function getCompanionText(locale: UiLocale, text: string, values?: Record<string, string | number>): string {
  const translated = locale === 'en' ? text : translations[text]?.[locale === 'pa' ? 0 : 1] ?? text
  return translated.replace(/\{(\w+)\}/g, (placeholder, key: string) => values?.[key] === undefined ? placeholder : String(values[key]))
}

export function useCompanionCopy() {
  const locale = useLocaleStore(state => state.locale)
  return { locale, lang: locale === 'pa' ? 'pa-Guru' : locale, t: (text: string, values?: Record<string, string | number>) => getCompanionText(locale, text, values) }
}
