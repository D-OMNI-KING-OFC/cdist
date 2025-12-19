// src/lib/translate.ts

export async function translateText(text: string, target: string): Promise<string> {
  if (target === "en") return text // no translation for English

  try {
    // Encode the LibreTranslate API URL for AllOrigins proxy
    const url = "https://thingproxy.freeboard.io/fetch/https://libretranslate.de/translate"

    

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "en",
        target,
        format: "text",
      }),
    })

    if (!res.ok) throw new Error("Translation API failed")

    const data = await res.json()
    return data.translatedText || text
  } catch (err) {
    console.error("Translation error:", err)
    return text // fallback to original if API fails
  }
}
