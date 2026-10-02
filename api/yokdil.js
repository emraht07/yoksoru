export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST kullanın."
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "OPENROUTER_API_KEY Vercel'de bulunamadı."
    });
  }

  try {
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
          messages: [
            {
              role: "system",
              content: "Sen YÖKDİL Sosyal Bilimler uzmanısın."
            },
            {
              role: "user",
              content: "YÖKDİL için kısa bir İngilizce kelime ve Türkçe anlamını ver."
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      }
    );

    // Önce text alıyoruz.
    // Böylece JSON olmayan Vercel/OpenRouter hatalarında
    // Unexpected token A hatası oluşmaz.
    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "OpenRouter JSON döndürmedi.",
        details: text.substring(0, 500)
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenRouter isteği başarısız oldu.",
        details: data
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content;

    return res.status(200).json({
      success: true,
      model: data?.model || "openrouter/free",
      answer: answer || ""
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error?.message || "Sunucu hatası."
    });
  }
}
