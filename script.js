// script.js (perbaikan)
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// === PERINGATAN KEAMANAN ===
// Jangan letakkan API KEY di frontend pada production.
// Gunakan proxy backend (contoh ada di bawah) untuk menyembunyikan API key.
const GEMINI_API_KEY = "YOUR_API_KEY"; // <-- hanya untuk testing lokal
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

if (!chatBox || !userInput || !sendBtn) {
  console.error("Element dengan id chat-box, user-input, atau send-btn tidak ditemukan di DOM.");
}

/** Tambah pesan ke chat box */
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`; // contoh class: "message user" / "message bot"
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/** Panggil Gemini API (frontend) - gunakan hanya untuk testing lokal */
async function askGemini(prompt, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": "AIzaSyDVuOKxZ3ujymCEZywZavyWOqQai-E1a8s"
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${t}`);
    }

    const data = await res.json();

    // Ambil teks jawaban dari kemungkinan struktur respons
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.output?.[0]?.content?.[0]?.text ||
      null;

    if (text) return text;
    // fallback: kembalikan JSON stringified kalau struktur tak terduga
    return JSON.stringify(data, null, 2);
  } catch (err) {
    if (err.name === "AbortError") return "❌ Permintaan timeout ke Gemini.";
    console.error("askGemini error:", err);
    return "❌ Terjadi kesalahan saat menghubungi Gemini API.";
  }
}

/** Untuk production: panggil proxy backend (lebih aman). Contoh pemanggilan backend ada di bagian bawah. */
async function askGeminiViaBackend(prompt) {
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${t}`);
    }
    const data = await res.json();
    // backend mengembalikan objek hasil. Sesuaikan parsing jika backend mengembalikan bentuk berbeda.
    return data?.reply || (data?.candidates?.[0]?.content?.parts?.[0]?.text) || JSON.stringify(data, null, 2);
  } catch (err) {
    console.error("askGeminiViaBackend error:", err);
    return "❌ Terjadi kesalahan saat menghubungi server.";
  }
}

/** Handler untuk mengirim pesan */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;
  addMessage("user", "👤: " + text);
  userInput.value = "";
  sendBtn.disabled = true;

  // placeholder "typing..."
  addMessage("bot", "🤖: Sedang mengetik...");
  const placeholder = chatBox.lastChild;

  // Gunakan salah satu:
  // 1) Untuk testing lokal (TIDAK AMAN di production): askGemini(text)
  // 2) Untuk production: askGeminiViaBackend(text)
  //
  // const botReply = await askGemini(text); // <-- testing saja
  const botReply = await askGeminiViaBackend(text); // <-- rekomendasi: pake backend

  // hapus placeholder
  if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);

  addMessage("bot", "🤖: " + botReply);
  sendBtn.disabled = false;
  userInput.focus();
}

/** Event listeners */
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
