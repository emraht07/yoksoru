import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

function cleanJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : text.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({error:"POST kullanın."});
  if (!process.env.GROQ_API_KEY) return res.status(500).json({error:"Vercel'de GROQ_API_KEY tanımlı değil."});

  try {
    const body = req.body || {};
    if (body.action === "vocabulary") {
      const batch = Number(body.batch || 1);
      const exclude = Array.isArray(body.exclude) ? body.exclude.slice(0,300) : [];
      const prompt = `
Sen YÖKDİL Sosyal Bilimler alanında uzman bir İngilizce sınav hazırlama asistanısın.
Amaç: Türk öğrencinin YÖKDİL Sosyal Bilimler için çalışacağı 1000 kelimelik havuzun ${batch}. 100 kelimelik paketini üret.
Alanlar: sociology, psychology, economics, politics, law, education, communication, anthropology, history, geography, public administration, international relations.
Her kayıt şu JSON alanlarına sahip olsun:
{"en":"English word/phrase","tr":"doğal Türkçe anlam","example":"YÖKDİL düzeyinde kısa İngilizce örnek cümle + Türkçe mini ipucu"}
Kurallar:
- 100 benzersiz kelime/kalıp üret.
- Akademik ve sınavda işe yarayan kelimeleri önceliklendir.
- Fiil, isim, sıfat ve akademik kalıpları dengeli dağıt.
- Çok temel A1 kelimelerden kaçın.
- Uydurma kelime üretme.
- Yanıt SADECE JSON dizi olsun.
Daha önce kullanılanlardan mümkün olduğunca kaçın: ${JSON.stringify(exclude)}
`;
      const completion = await client.chat.completions.create({
        model:"openai/gpt-oss-20b",
        messages:[{role:"user",content:prompt}],
        temperature:0.4,
        max_completion_tokens:9000,
        stream:false
      });
      const raw=cleanJson(completion.choices[0].message.content);
      const words=JSON.parse(raw);
      return res.status(200).json({words:Array.isArray(words)?words:[]});
    }

    if (body.action === "tactics") {
      const prompt = `
YÖKDİL Sosyal Bilimler hazırlığı için güncel web araştırması yap.
Son dönemde yayımlanmış güvenilir eğitim/sınav/akademik kaynakları ve mümkünse ÖSYM'nin resmi YÖKDİL açıklamalarını tarayarak
öğrencinin işine yarayacak 8-10 SOMUT çalışma taktiği çıkar.
Özellikle: bağlaçlar, tense, passive, relative clauses, vocabulary in context, paragraph completion, sentence completion,
reading speed, distractor analysis, social-science academic vocabulary.
Her taktik:
{"title":"kısa başlık","detail":"uygulanabilir açıklama","source":"kaynak adı + tarih veya URL başlığı"}
Kaynağın söylediklerini kendi yorumun gibi sunma. Resmi sınav formatı konusunda yalnızca doğrulanabilen bilgileri kullan.
Yanıt SADECE JSON dizi olsun.
`;
      const completion = await client.chat.completions.create({
        model:"openai/gpt-oss-20b",
        messages:[{role:"user",content:prompt}],
        temperature:0.2,
        max_completion_tokens:7000,
        stream:false,
        tool_choice:"required",
        tools:[{type:"browser_search"}]
      });
      const raw=cleanJson(completion.choices[0].message.content);
      const tactics=JSON.parse(raw);
      return res.status(200).json({tactics:Array.isArray(tactics)?tactics:[]});
    }

    return res.status(400).json({error:"Geçersiz action."});
  } catch (e) {
    console.error(e);
    return res.status(500).json({error:e?.message || "Groq isteği başarısız."});
  }
}
