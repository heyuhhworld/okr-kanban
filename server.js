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

app.listen(PORT, '0.0.0.0', () => {
  console.log('OKR 看板服务已启动');
  console.log('本机: http://localhost:' + PORT + '/OKR_Kanban.html');
  console.log('局域网: 用本机 IP:' + PORT + '/OKR_Kanban.html');
});
