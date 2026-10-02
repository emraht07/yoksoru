// ======================================================
// YÖKDİL AI - OPENROUTER
// API KEY SADECE VERCEL ENVIRONMENT VARIABLE'DA
// ======================================================

function cleanJson(text) {
  if (!text) return "";

  let result = text.trim();

  // ```json ... ``` temizle
  const fenced = result.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fenced) {
    result = fenced[1].trim();
  }

  // JSON dizisinin başını/sonunu bulmaya çalış
  const start = result.indexOf("[");
  const end = result.lastIndexOf("]");

  if (start !== -1 && end !== -1 && end > start) {
    result = result.substring(start, end + 1);
  }

  return result.trim();
}


// ======================================================
// OPENROUTER
// ======================================================

async function callOpenRouter(messages) {

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY Vercel Environment Variable olarak tanımlı değil."
    );
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        model: "openrouter/free",

        messages,

        temperature: 0.3,

        max_tokens: 12000,

        stream: false
      })
    }
  );


  // Önce text al
  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch (error) {

    console.error("OpenRouter JSON hatası:", text);

    throw new Error(
      "OpenRouter geçerli JSON döndürmedi: " +
      text.substring(0, 500)
    );
  }


  if (!response.ok) {

    console.error("OpenRouter API hatası:", data);

    throw new Error(
      data?.error?.message ||
      `OpenRouter HTTP ${response.status} hatası`
    );
  }


  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {

    console.error("Boş OpenRouter cevabı:", data);

    throw new Error(
      "OpenRouter modelinden cevap alınamadı."
    );
  }


  return content;
}


// ======================================================
// VERCEL API
// ======================================================

export default async function handler(req, res) {

  // Sadece POST
  if (req.method !== "POST") {

    return res.status(405).json({
      success: false,
      error: "Sadece POST kullanın."
    });
  }


  // API KEY
  if (!process.env.OPENROUTER_API_KEY) {

    return res.status(500).json({
      success: false,
      error:
        "OPENROUTER_API_KEY Vercel'de bulunamadı."
    });
  }


  try {

    const body = req.body || {};


    // ==================================================
    // KELİME ÜRET
    // ==================================================

    if (body.action === "vocabulary") {

      const batch =
        Number(body.batch || 1);

      const exclude =
        Array.isArray(body.exclude)
          ? body.exclude.slice(-500)
          : [];


      const prompt = `

Sen YÖKDİL Sosyal Bilimler alanında uzman
bir İngilizce sınav hazırlama asistanısın.

Görev:

YÖKDİL Sosyal Bilimler için tam olarak
100 adet akademik İngilizce kelime veya kalıp üret.

Bu ${batch}. pakettir.

Alanlar:

- Sociology
- Psychology
- Economics
- Politics
- Law
- Education
- Communication
- Anthropology
- History
- Geography
- Public Administration
- International Relations

Her kayıt tam olarak şu yapıda olmalıdır:

{
  "en": "English word or phrase",
  "tr": "Türkçe anlamı",
  "example": "İngilizce örnek cümle. Türkçe kısa açıklama."
}

Kurallar:

1. TAM 100 kayıt üret.
2. Bütün kayıtlar benzersiz olsun.
3. Akademik kelimelere öncelik ver.
4. YÖKDİL Sosyal Bilimler seviyesine uygun olsun.
5. A1-A2 seviyesindeki çok basit kelimelerden kaçın.
6. Fiil, isim, sıfat, zarf ve akademik kalıpları dengeli kullan.
7. Gerçek İngilizce kelimeler kullan.
8. Uydurma kelime kullanma.
9. Örnek cümleler YÖKDİL seviyesinde olsun.
10. Türkçe anlam doğru ve doğal olsun.
11. Daha önce kullanılan kelimeleri tekrar etme.
12. Yanıt SADECE JSON ARRAY olsun.
13. Markdown kullanma.
14. Açıklama yazma.

Daha önce kullanılan kelimeler:

${JSON.stringify(exclude)}

Tekrar etmemeye çalış.

`;


      let raw =
        await callOpenRouter([
          {
            role: "system",
            content:
              "YÖKDİL Sosyal Bilimler kelime uzmanısın. Sadece geçerli JSON ARRAY döndür."
          },

          {
            role: "user",
            content: prompt
          }
        ]);


      let cleaned =
        cleanJson(raw);


      let words;


      try {

        words =
          JSON.parse(cleaned);

      } catch (error) {

        console.error(
          "JSON parse başarısız:",
          cleaned
        );

        throw new Error(
          "Model geçerli JSON üretmedi."
        );
      }


      // Array değilse hata
      if (!Array.isArray(words)) {

        throw new Error(
          "Model kelime listesini ARRAY olarak döndürmedi."
        );
      }


      // Sadece doğru alanlara sahip kayıtları al
      words =
        words
          .filter(word =>
            word &&
            typeof word.en === "string" &&
            typeof word.tr === "string" &&
            typeof word.example === "string"
          )
          .map(word => ({
            en: word.en.trim(),
            tr: word.tr.trim(),
            example: word.example.trim()
          }));


      return res.status(200).json({

        success: true,

        batch: batch,

        count: words.length,

        words: words
      });
    }


    // ==================================================
    // TAKTİKLER
    // ==================================================

    if (body.action === "tactics") {

      const prompt = `

YÖKDİL Sosyal Bilimler öğrencileri için
10 uygulanabilir çalışma taktiği oluştur.

Konular:

- bağlaçlar
- tense
- passive voice
- relative clauses
- vocabulary
- vocabulary in context
- sentence completion
- paragraph completion
- reading
- distractor analysis

Her kayıt:

{
  "title": "Kısa başlık",
  "detail": "Uygulanabilir açıklama"
}

Yanıt SADECE JSON ARRAY olsun.
Markdown kullanma.
`;


      const raw =
        await callOpenRouter([
          {
            role: "system",
            content:
              "YÖKDİL eğitim uzmanısın."
          },

          {
            role: "user",
            content: prompt
          }
        ]);


      const cleaned =
        cleanJson(raw);

      let tactics;

      try {

        tactics =
          JSON.parse(cleaned);

      } catch {

        throw new Error(
          "Taktik cevabı geçerli JSON değil."
        );
      }


      return res.status(200).json({

        success: true,

        tactics:
          Array.isArray(tactics)
            ? tactics
            : []
      });
    }


    // ==================================================
    // GEÇERSİZ ACTION
    // ==================================================

    return res.status(400).json({

      success: false,

      error:
        "Geçersiz action."
    });


  } catch (error) {

    console.error(
      "YÖKDİL API HATASI:",
      error
    );


    return res.status(500).json({

      success: false,

      error:
        error?.message ||
        "Sunucu hatası."

    });
  }
}
