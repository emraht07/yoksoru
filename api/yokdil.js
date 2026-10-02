````js
// ============================================================
// YÖKDİL AI - OPENROUTER API
// Groq YOK
// Sadece OpenRouter
// ============================================================

function cleanJson(text) {
  if (!text) return "";

  // ```json ... ``` şeklindeki cevapları temizle
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fenced) {
    return fenced[1].trim();
  }

  return text.trim();
}


// ============================================================
// OPENROUTER İSTEĞİ
// ============================================================

async function callOpenRouter(messages, options = {}) {

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Vercel'de OPENROUTER_API_KEY tanımlı değil."
    );
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",

        // OpenRouter için opsiyonel başlıklar
        "HTTP-Referer": "https://yokdil.vercel.app",
        "X-Title": "YÖKDİL AI"
      },

      body: JSON.stringify({

        // Ücretsiz model router
        model: options.model || "openrouter/free",

        messages,

        temperature:
          options.temperature !== undefined
            ? options.temperature
            : 0.3,

        max_tokens:
          options.max_tokens || 8000,

        stream: false
      })
    }
  );


  // Önce text olarak alıyoruz.
  // Böylece "Unexpected token 'A'" hatası oluşmuyor.
  const text = await response.text();


  let data;

  try {

    data = JSON.parse(text);

  } catch (jsonError) {

    console.error(
      "OpenRouter JSON olmayan cevap:",
      text
    );

    throw new Error(
      `OpenRouter geçerli JSON döndürmedi: ${text.substring(
        0,
        500
      )}`
    );
  }


  // OpenRouter hata döndürdüyse
  if (!response.ok) {

    console.error(
      "OpenRouter API hatası:",
      data
    );

    throw new Error(
      data?.error?.message ||
      data?.error ||
      `OpenRouter HTTP ${response.status} hatası`
    );
  }


  const content =
    data?.choices?.[0]?.message?.content;


  if (!content) {

    console.error(
      "OpenRouter boş cevap:",
      data
    );

    throw new Error(
      "OpenRouter cevabında model çıktısı bulunamadı."
    );
  }


  return content;
}



// ============================================================
// VERCEL API
// ============================================================

export default async function handler(req, res) {

  // ----------------------------------------------------------
  // SADECE POST
  // ----------------------------------------------------------

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "POST kullanın."
    });
  }


  // ----------------------------------------------------------
  // API KEY KONTROLÜ
  // ----------------------------------------------------------

  if (!process.env.OPENROUTER_API_KEY) {

    return res.status(500).json({
      error:
        "Vercel'de OPENROUTER_API_KEY tanımlı değil."
    });
  }


  try {

    const body = req.body || {};


    // ========================================================
    // 1. KELİME ÜRETİMİ
    // ========================================================

    if (body.action === "vocabulary") {

      const batch =
        Number(body.batch || 1);


      const exclude =
        Array.isArray(body.exclude)
          ? body.exclude.slice(0, 300)
          : [];


      const prompt = `

Sen YÖKDİL Sosyal Bilimler alanında uzman
bir İngilizce sınav hazırlama asistanısın.

AMAÇ:

Türk öğrencinin YÖKDİL Sosyal Bilimler için
çalışacağı 1000 kelimelik akademik kelime
havuzunun ${batch}. 100 kelimelik paketini üret.

ALANLAR:

- sociology
- psychology
- economics
- politics
- law
- education
- communication
- anthropology
- history
- geography
- public administration
- international relations


HER KAYIT ŞU YAPIDA OLSUN:

{
  "en": "English word/phrase",
  "tr": "doğal Türkçe anlam",
  "example": "YÖKDİL düzeyinde kısa İngilizce örnek cümle + Türkçe mini ipucu"
}


KURALLAR:

- Tam 100 kelime/kalıp üret.
- Kelimeler benzersiz olsun.
- Akademik ve sınavda işe yarayan kelimeleri seç.
- YÖKDİL Sosyal Bilimler bağlamına uygun olsun.
- Fiil, isim, sıfat ve akademik kalıpları dengeli dağıt.
- Çok temel A1 kelimelerden kaçın.
- Uydurma kelime üretme.
- Gereksiz günlük konuşma kelimeleri kullanma.
- İngilizce kelimenin gerçek ve yaygın kullanımını tercih et.
- Örnek cümleler YÖKDİL seviyesinde olsun.
- Türkçe anlam doğal ve anlaşılır olsun.
- Yanıt SADECE JSON dizi olsun.
- Markdown kullanma.
- Açıklama yazma.

DAHA ÖNCE KULLANILAN KELİMELER:

${JSON.stringify(exclude)}

Bu listedeki kelimeleri mümkün olduğunca tekrar etme.

`;


      const raw =
        await callOpenRouter(

          [
            {
              role: "system",
              content:
                "Sen YÖKDİL Sosyal Bilimler uzmanısın. Yalnızca istenen JSON formatında cevap ver."
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


      const cleaned =
        cleanJson(raw);


      let words;


      try {

        words =
          JSON.parse(cleaned);

      } catch (error) {

        console.error(
          "Kelime JSON parse hatası:",
          cleaned
        );

        throw new Error(
          "Kelime üretiminde geçerli JSON alınamadı."
        );
      }


      return res.status(200).json({

        words:
          Array.isArray(words)
            ? words
            : []

      });
    }



    // ========================================================
    // 2. YÖKDİL TAKTİKLERİ
    // ========================================================

    if (body.action === "tactics") {

      const prompt = `

YÖKDİL Sosyal Bilimler hazırlığı için
öğrenciye uygulanabilir 8-10 çalışma taktiği oluştur.

ÖZELLİKLE:

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


HER TAKTİK ŞU YAPIDA OLSUN:

{
  "title": "kısa başlık",
  "detail": "uygulanabilir açıklama",
  "source": "kaynak veya dayanak"
}


KURALLAR:

- Uydurma kaynak oluşturma.
- Kaynak varmış gibi davranma.
- Resmi ÖSYM bilgisi olduğunu iddia etme.
- Emin olmadığın tarih veya sınav bilgisi verme.
- Öğrencinin gerçekten uygulayabileceği taktikler oluştur.
- Yanıt SADECE JSON dizi olsun.
- Markdown kullanma.
- Açıklama yazma.

`;


      const raw =
        await callOpenRouter(

          [
            {
              role: "system",
              content:
                "Sen YÖKDİL hazırlığında uzman bir eğitim asistanısın."
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


      const cleaned =
        cleanJson(raw);


      let tactics;


      try {

        tactics =
          JSON.parse(cleaned);

      } catch (error) {

        console.error(
          "Taktik JSON parse hatası:",
          cleaned
        );

        throw new Error(
          "Taktik üretiminde geçerli JSON alınamadı."
        );
      }


      return res.status(200).json({

        tactics:
          Array.isArray(tactics)
            ? tactics
            : []

      });
    }



    // ========================================================
    // GEÇERSİZ ACTION
    // ========================================================

    return res.status(400).json({

      error:
        "Geçersiz action. vocabulary veya tactics kullanın."

    });


  } catch (e) {

    console.error(
      "YÖKDİL API HATASI:",
      e
    );


    // ÖNEMLİ:
    // Her durumda frontend'e JSON gönderiyoruz.
    // Böylece:
    // Unexpected token 'A'
    // hatası oluşmaz.

    return res.status(500).json({

      error:
        e?.message ||
        "OpenRouter isteği başarısız.",

      provider:
        "openrouter"

    });
  }
}
````
