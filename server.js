/**
 * 简约 OKR 看板后端：用单文件 JSON 存储，所有人读写同一份数据。
 * 提供静态页面 + GET/POST /api/data
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data', 'okr.json');
const TRACK_FILE = path.join(__dirname, 'data', 'Track.csv');

app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

// 读取数据：无文件则返回空数组，前端会用 initialData 兜底
function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.error('readData error', e.message);
  }
  return [];
}

// 写入数据
function writeData(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('writeData error', e.message);
    return false;
  }
}

app.get('/api/data', (req, res) => {
  const data = readData();
  res.json(data);
});

app.post('/api/data', (req, res) => {
  const data = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ ok: false, message: '需要 JSON 数组' });
  }
  const ok = writeData(data);
  res.json({ ok });
});

// ---- Track CSV ----
function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;
  while (i < len) {
    const row = [];
    while (i < len) {
      if (text[i] === '"') {
        let field = '';
        i++;
        while (i < len) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              field += '"';
              i += 2;
              continue;
            }
            i++;
            break;
          }
          field += text[i++];
        }
        row.push(field);
        if (text[i] === ',') i++;
        else if (text[i] === '\r' || text[i] === '\n') break;
      } else {
        let field = '';
        while (i < len && text[i] !== ',' && text[i] !== '\r' && text[i] !== '\n') field += text[i++];
        row.push(field.trim());
        if (text[i] === ',') i++;
        else break;
      }
    }
    if (row.length) rows.push(row);
    while (i < len && (text[i] === '\r' || text[i] === '\n')) i++;
  }
  return rows;
}

function readTrack() {
  try {
    if (!fs.existsSync(TRACK_FILE)) return [];
    const raw = fs.readFileSync(TRACK_FILE, 'utf8');
    const rows = parseCSV(raw);
    if (!rows.length) return [];
    const header = rows[0].map((h) => (h || '').trim());
    const result = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const obj = {};
      for (let c = 0; c < header.length; c++) obj[header[c]] = row[c] ?? '';
      result.push(obj);
    }
    return result;
  } catch (e) {
    console.error('readTrack error', e.message);
    return [];
  }
}

function writeTrack(rows) {
  const header = ['序号', '主阶段', '节点', '产品条线', '状态', '优先级', '输出智能体', '输出技能'];
  try {
    fs.mkdirSync(path.dirname(TRACK_FILE), { recursive: true });

    const cleaned = (Array.isArray(rows) ? rows : [])
      .map((r) => {
        const obj = {};
        header.forEach((h) => (obj[h] = (r && r[h] != null ? String(r[h]) : '').replace(/\r?\n/g, ' ').trim()));
        return obj;
      })
      .filter((r) => Object.values(r).some((v) => v !== '')); // 至少一列非空

    // 重新编号 1..N
    cleaned.forEach((r, idx) => (r['序号'] = String(idx + 1)));

    const csvRows = [header].concat(cleaned.map((r) => header.map((h) => r[h])));
    const csv = csvRows
      .map((row) => row.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    fs.writeFileSync(TRACK_FILE, csv + '\r\n', 'utf8');
    return { ok: true, rows: cleaned };
  } catch (e) {
    console.error('writeTrack error', e.message);
    return { ok: false, rows: [] };
  }
}

app.get('/api/track', (req, res) => {
  res.json(readTrack());
});

app.post('/api/track', (req, res) => {
  const rows = req.body;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ ok: false, message: '需要 JSON 数组' });
  }
  const result = writeTrack(rows);
  res.json(result);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('OKR 看板服务已启动');
  console.log('本机: http://localhost:' + PORT + '/OKR_Kanban.html');
  console.log('局域网: 用本机 IP:' + PORT + '/OKR_Kanban.html');
});
