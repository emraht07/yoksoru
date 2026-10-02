````js
function cleanJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : text.trim();
}

async function openRouter(messages, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Vercel'de OPENROUTER_API_KEY tanımlı değil.");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://yokdil.vercel.app",
        "X-Title": "YÖKDİL AI"
      },
      body: JSON.stringify({
        model: options.model || "openrouter/free",
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 8000
      })
    }
  );

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `OpenRouter JSON olmayan cevap döndürdü: ${text.substring(0, 500)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      data?.error ||
      `OpenRouter HTTP ${response.status} hatası`
    );
  }

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenRouter cevabında model çıktısı bulunamadı.");
  }

  return content;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST kullanın."
    });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({
      error: "Vercel'de OPENROUTER_API_KEY tanımlı değil."
    });
  }

  try {
    const body = req.body || {};

    // =========================
    // KELİME ÜRETİCİ
    // =========================
    if (body.action === "vocabulary") {
      const batch = Number(body.batch || 1);

      const exclude = Array.isArray(body.exclude)
        ? body.exclude.slice(0, 300)
        : [];

      const prompt = `
Sen YÖKDİL Sosyal Bilimler alanında uzman
bir İngilizce sınav hazırlama asistanısın.

Amaç:
Türk öğrencinin YÖKDİL Sosyal Bilimler için
çalışacağı 1000 kelimelik havuzun
${batch}. 100 kelimelik paketini üret.

Alanlar:
sociology, psychology, economics, politics, law,
education, communication, anthropology, history,
geography, public administration,
international relations.

Her kayıt şu JSON alanlarına sahip olsun:

{
  "en": "English word/phrase",
  "tr": "doğal Türkçe anlam",
  "example": "YÖKDİL düzeyinde kısa İngilizce örnek cümle + Türkçe mini ipucu"
}

Kurallar:

- Tam 100 benzersiz kelime/kalıp üret.
- Akademik ve sınavda işe yarayan kelimeleri önceliklendir.
- Fiil, isim, sıfat ve akademik kalıpları dengeli dağıt.
- Çok temel A1 kelimelerden kaçın.
- Uydurma kelime üretme.
- YÖKDİL Sosyal Bilimler bağlamına uygun kelimeler seç.
- Yanıt SADECE JSON dizi olsun.
- Markdown kullanma.
- Açıklama yazma.

Daha önce kullanılan kelimeler:
${JSON.stringify(exclude)}
`;

      const raw = await openRouter(
        [
          {
            role: "system",
            content:
              "Yalnızca istenen JSON formatında cevap veren YÖKDİL uzmanısın."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        {
          model: "openrouter/free",
          temperature: 0.4,
          max_tokens: 12000
        }
      );

      const cleaned = cleanJson(raw);

      let words;

      try {
        words = JSON.parse(cleaned);
      } catch {
        throw new Error(
          "Kelime üretiminde geçerli JSON alınamadı."
        );
      }

      return res.status(200).json({
        words: Array.isArray(words) ? words : []
      });
    }

    // =========================
    // YÖKDİL TAKTİKLERİ
    // =========================
    if (body.action === "tactics") {

      const prompt = `
YÖKDİL Sosyal Bilimler hazırlığı için
öğrenciye uygulanabilir 8-10 çalışma taktiği oluştur.

Özellikle şu konulara odaklan:

- bağlaçlar
- tense
- passive voice
- relative clauses
- vocabulary in context
- paragraph completion
- sentence completion
- reading speed
- distractor analysis
- academic vocabulary
- sosyal bilimler metinleri

Her kayıt şu yapıda olsun:

{
  "title": "kısa başlık",
  "detail": "uygulanabilir açıklama",
  "source": "kaynak veya dayanak"
}

Önemli:

- Uydurma kaynak oluşturma.
- Gerçek zamanlı web araştırması yapmış gibi davranma.
- Resmi ÖSYM bilgisi olduğunu iddia etme.
- Emin olmadığın tarih veya sınav bilgisi verme.
- Yanıt SADECE JSON dizi olsun.
- Markdown kullanma.
`;

      const raw = await openRouter(
        [
          {
            role: "system",
            content:
              "YÖKDİL hazırlığında uzman bir eğitim asistanısın."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        {
          model: "openrouter/free",
          temperature: 0.2,
          max_tokens: 8000
        }
      );

      const cleaned = cleanJson(raw);

      let tactics;

      try {
        tactics = JSON.parse(cleaned);
      } catch {
        throw new Error(
          "Taktik üretiminde geçerli JSON alınamadı."
        );
      }

      return res.status(200).json({
        tactics: Array.isArray(tactics) ? tactics : []
      });
    }

    return res.status(400).json({
      error: "Geçersiz action."
    });

  } catch (e) {
    console.error("API ERROR:", e);

    return res.status(500).json({
      error: e?.message || "OpenRouter isteği başarısız.",
      provider: "openrouter"
    });
  }
}
````
