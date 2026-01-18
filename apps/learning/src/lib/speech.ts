// lib/speech.ts
// 文字轉語音工具

/**
 * 支援的語言列表
 */
export const supportedLanguages = [
  { code: "auto", label: "自動偵測" },
  { code: "zh-TW", label: "中文" },
  { code: "en-US", label: "英文" },
  { code: "es-ES", label: "西班牙語" },
  { code: "ja-JP", label: "日文" },
  { code: "ko-KR", label: "韓文" },
  { code: "fr-FR", label: "法文" },
  { code: "de-DE", label: "德文" },
] as const

export type LanguageCode = typeof supportedLanguages[number]["code"]

// 快取可用的語音
let cachedVoices: SpeechSynthesisVoice[] = []

/**
 * 取得可用的語音列表
 */
function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (cachedVoices.length > 0) {
      resolve(cachedVoices)
      return
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      cachedVoices = voices
      resolve(voices)
      return
    }

    // 有些瀏覽器需要等待 voiceschanged 事件
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices()
      resolve(cachedVoices)
    }

    // 超時保護
    setTimeout(() => {
      cachedVoices = window.speechSynthesis.getVoices()
      resolve(cachedVoices)
    }, 1000)
  })
}

/**
 * 根據語言代碼找到最佳的語音
 */
async function findBestVoice(lang: string): Promise<SpeechSynthesisVoice | null> {
  const voices = await getVoices()
  
  if (voices.length === 0) return null

  // 語言代碼對照（處理不同格式）
  const langMappings: Record<string, string[]> = {
    "zh-TW": ["zh-TW", "zh_TW", "zh-Hant", "zh"],
    "zh-CN": ["zh-CN", "zh_CN", "zh-Hans", "zh"],
    "en-US": ["en-US", "en_US", "en-GB", "en"],
    "es-ES": ["es-ES", "es_ES", "es-MX", "es"],
    "ja-JP": ["ja-JP", "ja_JP", "ja"],
    "ko-KR": ["ko-KR", "ko_KR", "ko"],
    "fr-FR": ["fr-FR", "fr_FR", "fr"],
    "de-DE": ["de-DE", "de_DE", "de"],
  }

  const possibleLangs = langMappings[lang] || [lang]

  // 1. 先嘗試精確匹配
  for (const tryLang of possibleLangs) {
    const exactMatch = voices.find(v => 
      v.lang === tryLang || v.lang.replace("_", "-") === tryLang
    )
    if (exactMatch) return exactMatch
  }

  // 2. 嘗試前綴匹配（例如 "en" 匹配 "en-US"）
  const baseLang = lang.split("-")[0]
  const prefixMatch = voices.find(v => v.lang.startsWith(baseLang))
  if (prefixMatch) return prefixMatch

  // 3. 返回預設語音
  return voices.find(v => v.default) || voices[0] || null
}

/**
 * 朗讀文字
 * @param text 要朗讀的文字
 * @param lang 語言代碼 (zh-TW, en-US, es-ES 等)
 * @param rate 語速 (0.5 - 2，預設 1)
 */
export async function speak(
  text: string,
  lang: string = "zh-TW",
  rate: number = 1
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // 檢查瀏覽器支援
    if (!("speechSynthesis" in window)) {
      reject(new Error("瀏覽器不支援語音功能"))
      return
    }

    // 停止之前的朗讀
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    
    // 嘗試找到最佳語音
    const voice = await findBestVoice(lang)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    } else {
      utterance.lang = lang
    }
    
    utterance.rate = rate
    utterance.pitch = 1

    utterance.onend = () => resolve()
    utterance.onerror = (event) => {
      // 某些錯誤可以忽略
      if (event.error === "interrupted" || event.error === "canceled") {
        resolve()
      } else {
        reject(event.error)
      }
    }

    // iOS Safari 需要這個 hack
    // 有時候第一次播放會失敗，需要重試
    try {
      window.speechSynthesis.speak(utterance)
      
      // iOS 修復：確保開始播放
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * 停止朗讀
 */
export function stopSpeaking(): void {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel()
  }
}

/**
 * 檢查是否正在朗讀
 */
export function isSpeaking(): boolean {
  if ("speechSynthesis" in window) {
    return window.speechSynthesis.speaking
  }
  return false
}

/**
 * 自動偵測語言
 */
export function detectLanguage(text: string): string {
  // 中文
  const hasChineseChar = /[\u4e00-\u9fa5]/.test(text)
  if (hasChineseChar) return "zh-TW"
  
  // 日文（平假名、片假名）
  const hasJapaneseChar = /[\u3040-\u309f\u30a0-\u30ff]/.test(text)
  if (hasJapaneseChar) return "ja-JP"
  
  // 韓文
  const hasKoreanChar = /[\uac00-\ud7af]/.test(text)
  if (hasKoreanChar) return "ko-KR"
  
  // 西班牙語特有字母
  const hasSpanishChar = /[áéíóúüñ¿¡]/i.test(text)
  if (hasSpanishChar) return "es-ES"
  
  // 法文特有字母
  const hasFrenchChar = /[àâäéèêëïîôùûüÿœæç]/i.test(text)
  if (hasFrenchChar) return "fr-FR"
  
  // 德文特有字母
  const hasGermanChar = /[äöüß]/i.test(text)
  if (hasGermanChar) return "de-DE"
  
  // 預設英文
  return "en-US"
}

/**
 * 朗讀文字（使用指定語言或自動偵測）
 * @param text 要朗讀的文字
 * @param lang 語言代碼，"auto" 表示自動偵測
 * @param rate 語速
 */
export function speakWithLang(
  text: string,
  lang: LanguageCode = "auto",
  rate: number = 1
): Promise<void> {
  const actualLang = lang === "auto" ? detectLanguage(text) : lang
  return speak(text, actualLang, rate)
}

/**
 * 朗讀文字（自動偵測語言）- 向後相容
 */
export function speakAuto(text: string, rate: number = 1): Promise<void> {
  const lang = detectLanguage(text)
  return speak(text, lang, rate)
}

/**
 * 取得設備支援的語言列表（用於除錯）
 */
export async function getSupportedVoices(): Promise<{ lang: string; name: string }[]> {
  const voices = await getVoices()
  return voices.map(v => ({ lang: v.lang, name: v.name }))
}
