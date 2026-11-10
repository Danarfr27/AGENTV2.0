# ⚡ FIRDHAN-AGENT-V1.0

AI Chatbot dengan tema Cyberpunk Gundam + OCR Capability

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Theme](https://img.shields.io/badge/theme-cyberpunk--gundam-purple)
![OCR](https://img.shields.io/badge/OCR-enabled-green)

## 🚀 Fitur

- 💬 **AI Chat** - Powered by DeepSeek V4.1
- 📷 **Image Upload** - Analisis gambar
- 🔍 **OCR** - Ekstrak teks dari gambar (Tesseract.js)
- 📄 **Document Upload** - PDF, TXT support
- 📁 **Drag & Drop** - Upload file dengan mudah
- 🎨 **Cyberpunk UI** - Tema Gundam futuristik
- 📱 **Responsive** - Mobile & Desktop friendly
- ⚡ **Serverless** - Deploy ke Vercel instantly

## 📁 Struktur Folder

```
FIRDHAN-AGENT-V1.0/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # All styles
├── js/
│   ├── config.js       # Client-side configuration (no API keys)
│   └── app.js          # Main application logic
├── api/
│   └── chat.js         # Serverless proxy to OpenRouter
├── .env.local          # Local server-only environment variables
├── .env.example        # Environment template
├── vercel.json         # Vercel configuration
└── README.md           # This file
```

## 🛠️ Installation

### Local Development

1. Clone repository
```bash
git clone https://github.com/yourusername/FIRDHAN-AGENT-V1.0.git
cd FIRDHAN-AGENT-V1.0
```

2. Copy environment template
```bash
cp .env.example .env.local
```

3. Isi `SUMOPOD_API_KEY` di `.env.local` dengan API key Sumopod Anda.
   `SUMOPOD_BASE_URL` bersifat opsional dan default ke `https://ai.sumopod.com/v1`.
   Pilihan model tersedia pada dropdown di sisi kanan header dan tersimpan di browser.

4. Jalankan aplikasi menggunakan Vercel CLI agar endpoint `/api/chat` tersedia:
```bash
npx vercel dev
```

Jangan membuka `index.html` langsung atau menggunakan static Live Server untuk menguji chat karena keduanya tidak menjalankan serverless function.

### Deploy ke Vercel

1. Push source code ke GitHub dan import repository ke Vercel.
2. Buka **Project Settings → Environment Variables** dan tambahkan:
   - `SUMOPOD_API_KEY`: API key Sumopod
   - `SUMOPOD_BASE_URL`: `https://ai.sumopod.com/v1` (opsional)
3. Pilih environment yang diperlukan (Production, Preview, Development), simpan, lalu deploy/redeploy.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## ⚙️ Configuration

API key hanya dibaca oleh endpoint server di `api/chat.js` dan tidak dikirim ke browser. Jika Sumopod mengembalikan 401, buat atau rotasi API key Sumopod, perbarui `SUMOPOD_API_KEY` pada environment yang aktif, lalu restart server lokal atau redeploy Vercel. Cabut key lama yang pernah tersimpan di file atau percakapan.

## 📝 License

MIT License - feel free to use and modify!

## 🙏 Credits

- DeepSeek AI - Language Model
- Tesseract.js - OCR Engine
- OpenRouter - API Gateway
- Gundam - Inspiration

---

**FIRDHAN-AGENT-V1.0** - *Neural Link Established* ⚡
