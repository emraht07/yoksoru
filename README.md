# YÖKDİL Sosyal Bilimler AI Asistanı

## Mimari
- `index.html`: sınıf/öğrenci arayüzü
- `api/yokdil.js`: Vercel serverless API
- Groq: AI üretimi
- Groq Browser Search: güncel web araştırması
- GitHub: kaynak kodu
- Vercel: yayınlama
- localStorage: kelime ve öğrenildi durumunu tarayıcıda saklama

## Vercel
1. Bu klasörü GitHub repository olarak yükleyin.
2. Vercel'de **Import Project** ile repository'yi bağlayın.
3. Vercel Project Settings > Environment Variables:
   - Key: `GROQ_API_KEY`
   - Value: Groq API anahtarınız
4. Redeploy yapın.

## Önemli
Groq API anahtarını `index.html` içine yazmayın.

## Çalışma
"1000 Kelimeyi Oluştur / Yenile" 10 adet 100 kelimelik API çağrısı yapar.
"Güncel Taktikleri Getir" Groq browser search kullanarak güncel web kaynaklarını araştırır.

Gerçek zamanlı güncelleme, kullanıcının butona basmasıyla gerçekleşir. İsterseniz daha sonra Vercel Cron + veritabanı eklenerek ortak sınıf havuzu otomatik yenilenebilir.
