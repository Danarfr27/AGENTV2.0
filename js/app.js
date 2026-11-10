(function () {
'use strict';

const LS = {
    chats: 'firdhan_chats',
    current: 'firdhan_current_chat',
    model: 'firdhan_model'
};

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

class Agent {
    constructor() {
        this.chats = this.load(LS.chats, []);
        this.currentId = localStorage.getItem(LS.current) || null;
        this.model = localStorage.getItem(LS.model) || 'gemini/gemini-3.5-flash-lite';
        this.abort = null;
        this.currentFile = null;
        this.currentFileData = null;
        this.el = {
            sidebar: $('sidebar'), overlay: $('sidebarOverlay'), chatList: $('chatList'),
            container: $('chatContainer'), welcome: $('welcomeScreen'), input: $('userInput'),
            sendBtn: $('sendBtn'), stopBtn: $('stopBtn'), attachBtn: $('attachBtn'),
            fileInput: $('fileInput'), previewArea: $('previewArea'), previewContent: $('previewContent'),
            modelSelect: $('modelSelect'), themeToggle: $('themeToggle'), logoutBtn: $('logoutBtn'),
            newChatBtn: $('newChatBtn'), menuBtn: $('menuBtn'), topbarTitle: $('topbarTitle'),
            userName: $('userName'), userRole: $('userRole'), userAvatar: $('userAvatar')
        };
        this.init();
    }

    load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } }
    save() {
        try { localStorage.setItem(LS.chats, JSON.stringify(this.chats)); }
        catch { this.toast('⚠️ Penyimpanan browser penuh — histori gambar besar tidak disimpan.'); }
    }

    init() {
        this.initModels();
        this.bind();
        this.renderSidebar();
        this.openChat(this.currentId, true);
        auth.getUser().then(u => {
            if (!u) return;
            this.el.userName.textContent = u.username;
            this.el.userRole.textContent = u.role;
            this.el.userAvatar.textContent = (u.username[0] || 'F').toUpperCase();
        });
    }

    initModels() {
        const chatModels = SUMOPOD_MODELS.filter(m => !/embedding/i.test(m));
        this.el.modelSelect.replaceChildren(...chatModels.map(m => {
            const o = document.createElement('option');
            o.value = o.textContent = m;
            return o;
        }));
        this.el.modelSelect.value = this.model;
        this.el.modelSelect.addEventListener('change', () => {
            this.model = this.el.modelSelect.value;
            localStorage.setItem(LS.model, this.model);
            this.toast('✓ Model: ' + this.model);
        });
    }

    bind() {
        this.el.newChatBtn.onclick = () => this.newChat();
        this.el.logoutBtn.onclick = () => auth.logout();
        this.el.sendBtn.onclick = () => this.send();
        this.el.stopBtn.onclick = () => this.abort && this.abort.abort();
        this.el.attachBtn.onclick = () => this.el.fileInput.click();
        this.el.fileInput.onchange = e => e.target.files[0] && this.handleFile(e.target.files[0]);
        this.el.modelSelect; // bound above
        this.el.themeToggle.onclick = () => {
            const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
            document.documentElement.dataset.theme = next;
            localStorage.setItem('firdhan_theme', next);
            this.el.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
        };
        this.el.themeToggle.textContent = document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙';
        this.el.menuBtn.onclick = () => this.el.sidebar.classList.toggle('open');
        this.el.overlay.onclick = () => this.el.sidebar.classList.remove('open');

        this.el.input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
        });
        this.el.input.addEventListener('input', () => {
            this.el.input.style.height = 'auto';
            this.el.input.style.height = Math.min(this.el.input.scrollHeight, 200) + 'px';
        });

        ['dragover'].forEach(ev => document.addEventListener(ev, e => {
            e.preventDefault(); $('dragOverlay').classList.add('active');
        }));
        document.addEventListener('drop', e => {
            e.preventDefault(); $('dragOverlay').classList.remove('active');
            if (e.dataTransfer.files[0]) this.handleFile(e.dataTransfer.files[0]);
        });
        document.addEventListener('dragleave', e => {
            if (e.target === document.body) $('dragOverlay').classList.remove('active');
        });
    }

    // ---------- Sidebar & histori ----------
    newChat() {
        const c = { id: 'c' + Date.now(), title: 'New Chat', createdAt: Date.now(), updatedAt: Date.now(), model: this.model, messages: [] };
        this.chats.unshift(c);
        this.save(); this.openChat(c.id);
    }

    openChat(id, silent) {
        const c = this.chats.find(x => x.id === id);
        this.currentId = c ? id : null;
        localStorage.setItem(LS.current, this.currentId || '');
        this.renderSidebar();
        this.renderMessages();
        if (!silent) this.closeSidebarMobile();
    }

    deleteChat(id, e) {
        e.stopPropagation();
        if (!confirm('Hapus chat ini?')) return;
        this.chats = this.chats.filter(c => c.id !== id);
        if (this.currentId === id) this.currentId = null;
        this.save(); this.renderSidebar(); this.renderMessages();
    }

    current() { return this.chats.find(c => c.id === this.currentId) || null; }

    renderSidebar() {
        const sorted = [...this.chats].sort((a, b) => b.updatedAt - a.updatedAt);
        this.el.chatList.innerHTML = sorted.length ? '' : '<div class="empty-hist">Belum ada percakapan</div>';
        sorted.forEach(c => {
            const item = document.createElement('div');
            item.className = 'chat-item' + (c.id === this.currentId ? ' active' : '');
            item.innerHTML = `<span class="chat-title">${esc(c.title)}</span>
                <span class="chat-time">${this.relTime(c.updatedAt)}</span>
                <button class="chat-del" title="Hapus">✕</button>`;
            item.onclick = () => this.openChat(c.id);
            item.querySelector('.chat-del').onclick = e => this.deleteChat(c.id, e);
            this.el.chatList.appendChild(item);
        });
    }

    renderMessages() {
        const c = this.current();
        this.el.container.innerHTML = '';
        this.el.topbarTitle.textContent = c ? c.title : 'New Chat';
        this.el.welcome.style.display = c && c.messages.length ? 'none' : 'flex';
        if (!c) return;
        c.messages.forEach(m => this.appendBubble(m.role, m.content, false));
        this.scrollBottom(true);
    }

    // ---------- Kirim pesan & streaming ----------
    async send() {
        const text = this.el.input.value.trim();
        if ((!text && !this.currentFile) || this.abort) return;
        this.setBusy(true);

        if (!this.current()) { this.newChat(); }
        const chat = this.current();
        chat.model = this.model;

        let content = text || '(File upload)';
        let fileInfo = '';

        if (this.currentFile) {
            const isImg = this.currentFile.type.startsWith('image/');
            if (isImg) {
                this.appendBubble('user', content, true, { img: this.currentFileData, name: this.currentFile.name });
                const ocr = await this.runOCR(this.currentFileData);
                fileInfo = ocr && ocr.trim() ? `\n\n[HASIL OCR]:\n${ocr}` : '\n\n[GAMBAR DIUNGGAH - tidak ada teks terdeteksi]';
            } else {
                this.appendBubble('user', content, true, { file: this.currentFile.name });
                fileInfo = `\n\n[ISI FILE ${this.currentFile.name}]:\n${this.currentFileData}`;
            }
        } else {
            this.appendBubble('user', content);
        }
        chat.messages.push({ role: 'user', content: content + fileInfo, ts: Date.now() });
        if (chat.messages.filter(m => m.role === 'user').length === 1) {
            chat.title = content.slice(0, 42) + (content.length > 42 ? '…' : '');
        }
        chat.updatedAt = Date.now();
        this.save(); this.renderSidebar();
        this.el.input.value = ''; this.el.input.style.height = 'auto';
        this.removeFile();

        const bubble = this.appendBubble('assistant', '');
        const apiMsgs = [{ role: 'system', content: SYSTEM_PROMPT }]
            .concat(chat.messages.map(m => ({ role: m.role, content: m.content })));

        this.abort = new AbortController();
        let full = '';
        try {
            const res = await fetch('/api/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMsgs, model: this.model }),
                signal: this.abort.signal
            });
            if (!res.ok) {
                const d = await res.json().catch(() => null);
                throw new Error((d && d.error) || 'HTTP ' + res.status);
            }
            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = '';
            const apply = raw => {
                const data = raw.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('\n');
                if (!data || data === '[DONE]') return;
                try {
                    const delta = JSON.parse(data).choices?.[0]?.delta?.content;
                    if (delta) { full += delta; this.setBubble(bubble, full); }
                } catch { /* chunk parsial */ }
            };
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const evs = buf.split(/\r?\n\r?\n/);
                buf = evs.pop() || '';
                evs.forEach(apply);
            }
            if (buf.trim()) apply(buf);
            if (!full) throw new Error('Model tidak mengirim jawaban.');
            chat.messages.push({ role: 'assistant', content: full, ts: Date.now() });
            chat.updatedAt = Date.now();
            this.save();
        } catch (err) {
            this.setBubble(bubble, full ? full + '\n\n⛔ ' + err.message : '⚠️ ' + err.message);
        } finally {
            this.abort = null;
            this.setBusy(false);
            this.el.input.focus();
        }
    }

    setBusy(b) {
        this.el.sendBtn.disabled = b;
        this.el.sendBtn.style.display = b ? 'none' : '';
        this.el.stopBtn.style.display = b ? '' : 'none';
    }

    // ---------- Bubble & markdown ringan ----------
    appendBubble(role, text, animate, extra) {
        const wrap = document.createElement('div');
        wrap.className = 'msg-row ' + role;
        const inner = extra && extra.img
            ? `<div class="msg-img-wrap"><img src="${extra.img}" class="msg-img" alt="${esc(extra.name)}"></div>`
            : extra && extra.file ? `<div class="msg-file">📄 ${esc(extra.file)}</div>` : '';
        wrap.innerHTML = `<div class="bubble">${inner}<div class="msg-text"></div>${role === 'assistant' ? '<button class="copy-btn" title="Salin">⧉</button>' : ''}</div>`;
        this.el.container.appendChild(wrap);
        this.setBubble(wrap, text);
        if (animate) wrap.style.animation = 'fadeUp .25s ease';
        this.scrollBottom();
        const cb = wrap.querySelector('.copy-btn');
        if (cb) cb.onclick = () => { navigator.clipboard.writeText(wrap.dataset.raw || ''); cb.textContent = '✓'; setTimeout(() => cb.textContent = '⧉', 1200); };
        this.el.welcome.style.display = 'none';
        return wrap;
    }

    setBubble(wrap, raw) {
        wrap.dataset.raw = raw;
        wrap.querySelector('.msg-text').innerHTML = this.md(esc(raw));
        this.scrollBottom();
    }

    md(html) {
        const blocks = [];
        html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (m, l, code) => {
            blocks.push(code.trim());
            return '\u0000' + (blocks.length - 1) + '\u0000';
        });
        html = html
            .replace(/^###### (.*)$/gm, '<h6>$1</h6>').replace(/^##### (.*)$/gm, '<h5>$1</h5>')
            .replace(/^#### (.*)$/gm, '<h4>$1</h4>').replace(/^### (.*)$/gm, '<h3>$1</h3>')
            .replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h2>$1</h2>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
            .replace(/`([^`\n]+)`/g, '<code class="ic">$1</code>')
            .replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
            .replace(/^\s*[-*] (.*)$/gm, '<li>$1</li>')
            .replace(/^\s*(\d+)\. (.*)$/gm, '<li>$2</li>')
            .replace(/\n/g, '<br>');
        html = html.replace(/\u0000(\d+)\u0000/g, (m, i) => `<pre class="code"><code>${blocks[+i]}</code></pre>`);
        return html;
    }

    // ---------- File & OCR ----------
    handleFile(file) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type) && !CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
            return this.toast('⚠️ Tipe file tidak didukung.');
        }
        if (file.size > CONFIG.MAX_FILE_SIZE) return this.toast('⚠️ Maksimal 10MB.');
        this.currentFile = file;
        const r = new FileReader();
        r.onload = e => { this.currentFileData = e.target.result; this.showPreview(file); };
        file.type.startsWith('image/') ? r.readAsDataURL(file) : r.readAsText(file);
    }

    showPreview(file) {
        const isImg = file.type.startsWith('image/');
        this.el.previewContent.innerHTML = isImg
            ? `<img src="${this.currentFileData}" class="pv-img"><div>📷 ${esc(file.name)} • ${this.fmtSize(file.size)}</div>`
            : `<div style="font-size:2rem">📄</div><div>${esc(file.name)} • ${this.fmtSize(file.size)}</div>`;
        this.el.previewArea.classList.add('active');
    }

    removeFile() {
        this.currentFile = this.currentFileData = null;
        this.el.fileInput.value = '';
        this.el.previewArea.classList.remove('active');
    }

    async runOCR(data) {
        const p = document.createElement('div');
        p.className = 'msg-row assistant';
        p.innerHTML = '<div class="bubble"><div class="msg-text ocr-status">🔍 OCR… <span class="ocr-pct">0%</span></div></div>';
        this.el.container.appendChild(p);
        this.scrollBottom();
        try {
            const res = await Tesseract.recognize(data, CONFIG.OCR_LANGUAGES, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const el = p.querySelector('.ocr-pct');
                        if (el) el.textContent = Math.round(m.progress * 100) + '%';
                    }
                }
            });
            p.remove();
            return res.data.text;
        } catch (e) { p.remove(); return ''; }
    }

    // ---------- Util ----------
    scrollBottom(force) {
        const c = this.el.container;
        if (force || c.scrollHeight - c.scrollTop - c.clientHeight < 160) c.scrollTop = c.scrollHeight;
    }
    closeSidebarMobile() { this.el.sidebar.classList.remove('open'); }
    relTime(ts) {
        const d = Date.now() - ts;
        if (d < 60e3) return 'baru saja';
        if (d < 3600e3) return Math.floor(d / 60e3) + 'm';
        if (d < 86400e3) return Math.floor(d / 3600e3) + 'j';
        return Math.floor(d / 86400e3) + 'h';
    }
    fmtSize(b) {
        const u = ['B', 'KB', 'MB', 'GB'];
        const i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
        return (b / 1024 ** i).toFixed(1) + ' ' + u[i];
    }
    toast(msg) {
        const t = document.createElement('div');
        t.className = 'toast'; t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
    }
}

window.addEventListener('DOMContentLoaded', () => new Agent());
})();