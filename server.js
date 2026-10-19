// Theo dõi học tập — máy chủ chạy local (Node), gửi nhắc việc qua Telegram
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PUB = path.join(DIR, 'public');
const DATA_DIR = process.env.DATA_DIR || DIR;
fs.mkdirSync(DATA_DIR, { recursive: true });
const DATA = path.join(DATA_DIR, 'data.json');
const PORT = process.env.PORT || 8787;
const TZ = 'Asia/Ho_Chi_Minh';

let db = { state: null, telegram: { token: '', chatId: '' }, lastSent: '' };
try { db = { ...db, ...JSON.parse(fs.readFileSync(DATA, 'utf8')) }; } catch (e) {}
function persist() { fs.writeFileSync(DATA, JSON.stringify(db, null, 2)); }

const SUPPLIES = {
  'Toán': ['Sách Toán', 'Vở ô li Toán'],
  'Tiếng Việt': ['Sách Tiếng Việt', 'Vở tập viết'],
  'Tiếng Anh': ['Sách Tiếng Anh', 'Vở Tiếng Anh'],
  'Tự nhiên & Xã hội': ['Sách Tự nhiên & Xã hội', 'Vở TN&XH'],
  'Mỹ thuật': ['Giấy vẽ', 'Màu sáp', 'Bút chì'],
  'Khác': []
};

// Giờ và ngày theo múi giờ Việt Nam. wd: Thứ Hai = 0 … Chủ Nhật = 6
function now() {
  const d = new Date();
  const hhmm = d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('sv-SE', { timeZone: TZ });
  const local = new Date(d.toLocaleString('en-US', { timeZone: TZ }));
  return { hhmm, date, wd: (local.getDay() + 6) % 7 };
}

// Ngày của một việc: việc mới có sẵn ngày; việc cũ dùng "hôm nay"/"ngày mai" theo cách cũ
function taskDate(t) {
  if (t.date) return t.date;
  const d = new Date();
  if (t.due === 'tomorrow') d.setTime(d.getTime() + 86400000);
  return d.toLocaleDateString('sv-SE', { timeZone: TZ });
}
const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// Danh sách các con: mỗi con có thời khoá biểu, việc nhắc và việc cần làm riêng
function kidsOf(st) {
  if (Array.isArray(st.kids) && st.kids.length) return st.kids;
  return [{ id: 'main', child: st.child, schedule: st.schedule, tasks: st.tasks || [], reminders: st.reminders || [] }];
}

function buildMessage(k) {
  const n = now();
  const tomorrowIdx = (n.wd + 1) % 7;
  const tasks = k.tasks || [];
  const undone = tasks.filter(t => t.due === 'today' && !t.done);
  const tomorrowTasks = tasks.filter(t => t.due === 'tomorrow' && !t.done);
  const periods = ((k.schedule || {})[tomorrowIdx] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
  const names = [];
  periods.forEach(p => (SUPPLIES[p.s] || []).forEach(x => { if (!names.includes(x)) names.push(x); }));

  const lines = ['🔔 Nhắc học tập — ' + k.child.name, ''];
  lines.push('📌 Việc còn lại hôm nay:');
  lines.push(undone.length ? undone.map(t => '• ' + t.t + ' (' + t.time + ')').join('\n') : '• Đã xong hết 🎉');
  lines.push('', '📅 Ngày mai có ' + periods.length + ' tiết:');
  lines.push(periods.length ? periods.map(p => '• ' + p.time + ' ' + p.s + (p.room ? ' — ' + p.room : '')).join('\n') : '• Không có tiết');
  if (names.length) lines.push('', '🎒 Chuẩn bị: ' + names.join(', '));
  if (tomorrowTasks.length) lines.push('', '⏰ Việc ngày mai: ' + tomorrowTasks.map(t => t.t).join('; '));
  return lines.join('\n');
}

async function tgCall(method, body) {
  let r;
  try {
    r = await fetch('https://api.telegram.org/bot' + db.telegram.token + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
  } catch (e) {
    throw new Error('Không kết nối được tới Telegram. Kiểm tra mạng internet trên máy này.');
  }
  const j = await r.json().catch(() => ({ ok: false, description: 'Telegram trả về dữ liệu không hợp lệ' }));
  if (!j.ok) throw new Error(j.description || 'Telegram báo lỗi');
  return j.result;
}
function send(text) {
  if (!db.telegram.chatId) throw new Error('Chưa kết nối với phụ huynh');
  return tgCall('sendMessage', { chat_id: db.telegram.chatId, text });
}

// Kiểm tra mỗi 30 giây: đúng giờ nhắc và hôm nay chưa gửi thì gửi tin
db.sentRoutine = db.sentRoutine || {};
setInterval(async () => {
  if (!db.state || !db.telegram.token || !db.telegram.chatId) return;
  const n = now();
  const nowMin = toMin(n.hhmm);
  db.sent = db.sent || {};
  for (const k of kidsOf(db.state)) {
    const tag = '\n👧 ' + (k.child && k.child.name ? k.child.name : '');
    // Nhắc việc: một lần đúng ngày giờ đã chọn, hoặc lặp hằng ngày theo giờ
    for (const r of k.reminders || []) {
      const isDaily = r.repeat === 'daily';
      // Nhắc một lần: gửi khi tới giờ (kể cả trễ vài phút trong cùng ngày nếu máy vừa được bật lại)
      const due = isDaily ? r.time === n.hhmm : (r.date === n.date && r.time <= n.hhmm);
      const key = r.id + '|' + (isDaily ? n.date : r.date + ' ' + r.time);
      if (!due || db.sent[key]) continue;
      db.sent[key] = true;
      persist();
      const when = isDaily ? 'Hằng ngày lúc ' + r.time : r.date + ' lúc ' + r.time;
      try {
        await send('🔔 ' + r.t + '\n⏰ ' + when + (r.note ? '\n📝 ' + r.note : ''));
      } catch (e) {
        console.error('Gửi nhắc lỗi:', e.message);
      }
    }
    // Giờ học: báo khi bắt đầu và khi kết thúc từng tiết trong ngày hôm nay
    const todays = [].concat(
      ((k.schedule || {})[n.wd] || []).map(l => ({ l, kind: "Tiết học", name: l.s })),
      (k.tutoring || []).filter(l => Number(l.day) === n.wd).map(l => ({ l, kind: "Phụ đạo", name: l.title })),
      (k.outside || []).filter(l => Number(l.day) === n.wd).map(l => ({ l, kind: "Hoạt động ngoài", name: l.title }))
    );
    for (const { l, kind, name } of todays) {
      const where = l.room || l.note ? "\n📍 " + (l.room || l.note) : "";
      if (l.time === n.hhmm && !db.sent["lesson|" + k.id + "|" + l.id + "|" + n.date + "|start"]) {
        db.sent["lesson|" + k.id + "|" + l.id + "|" + n.date + "|start"] = true;
        persist();
        try { await send("🔔 Bắt đầu " + kind.toLowerCase() + ": " + name + "\n⏰ " + l.time + where + tag); }
        catch (e) { console.error("Gửi nhắc lỗi:", e.message); }
      }
      if (l.end && l.end === n.hhmm && !db.sent["lesson|" + k.id + "|" + l.id + "|" + n.date + "|end"]) {
        db.sent["lesson|" + k.id + "|" + l.id + "|" + n.date + "|end"] = true;
        persist();
        try { await send("🏁 Kết thúc " + kind.toLowerCase() + ": " + name + "\n⏰ " + l.end + tag); }
        catch (e) { console.error("Gửi nhắc lỗi:", e.message); }
      }
    }
    // Việc sắp đến hạn trong 60 phút tới (mỗi việc báo một lần)
    const openTasks = (k.tasks || []).filter(t => !t.done);
    for (const t of openTasks) {
      const td = taskDate(t);
      if (td !== n.date || !t.time) continue;
      const diff = toMin(t.time) - nowMin;
      const key = 'soon|' + t.id + '|' + td;
      if (diff < 0 || diff > 60 || db.sent[key]) continue;
      db.sent[key] = true;
      persist();
      try {
        await send('⏳ Sắp đến hạn: ' + t.t + '\n⏰ ' + t.time + (t.priority ? ' · Ưu tiên ' + t.priority : '') + tag);
      } catch (e) {
        console.error('Gửi nhắc lỗi:', e.message);
      }
    }
    if (n.hhmm !== db.state.reminder) continue;
    // Việc quá hạn chưa hoàn thành: báo một lần mỗi ngày vào giờ nhắc chung
    const overdueKey = 'overdue|' + k.id + '|' + n.date;
    if (!db.sent[overdueKey]) {
      const overdue = openTasks.filter(t => taskDate(t) < n.date);
      if (overdue.length) {
        db.sent[overdueKey] = true;
        persist();
        try {
          await send('⚠️ Việc quá hạn chưa hoàn thành:\n' + overdue.map(t => '• ' + t.t + ' (hạn ' + taskDate(t) + ')').join('\n') + tag);
        } catch (e) {
          console.error('Gửi nhắc lỗi:', e.message);
        }
      }
    }
    // Tóm tắt chung của từng con vào giờ nhắc hằng ngày
    const sumKey = 'summary|' + k.id + '|' + n.date;
    if (db.sent[sumKey]) continue;
    db.sent[sumKey] = true;
    persist();
    try {
      await send(buildMessage(k));
      console.log('Đã gửi nhắc lúc', n.hhmm, 'cho', k.child && k.child.name);
    } catch (e) {
      console.error('Gửi nhắc lỗi:', e.message);
    }
  }
}, 30000);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(e); } });
  });
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/state') {
      return json(res, 200, { state: db.state, telegram: { hasToken: !!db.telegram.token, connected: !!db.telegram.chatId } });
    }
    if (req.method === 'POST' && url.pathname === '/api/state') {
      db.state = await readBody(req);
      persist();
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/telegram/token') {
      const b = await readBody(req);
      db.telegram = { token: (b.token || '').trim(), chatId: '' };
      persist();
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/telegram/detect') {
      if (!db.telegram.token) return json(res, 400, { error: 'Hãy lưu token bot trước.' });
      const updates = await tgCall('getUpdates', {});
      const last = updates.filter(u => u.message).pop();
      if (!last) return json(res, 400, { error: 'Chưa có tin nhắn nào. Phụ huynh hãy mở bot và bấm Start trước.' });
      db.telegram.chatId = String(last.message.chat.id);
      persist();
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/telegram/test') {
      await send('✅ Kết nối thành công. Phụ huynh sẽ nhận nhắc học tập tại đây.');
      return json(res, 200, { ok: true });
    }

    // Phục vụ giao diện
    const p = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = path.join(PUB, path.normalize(p));
    if (!file.startsWith(PUB)) return json(res, 403, { error: 'forbidden' });
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}).listen(PORT, () => console.log('Theo dõi học tập đang chạy tại http://localhost:' + PORT));
