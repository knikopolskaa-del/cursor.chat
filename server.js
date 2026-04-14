// server.js — сервер шахматной платформы
//
// Что делает этот файл:
//   1. Раздаёт статические файлы (index.html, chess.js, styles.css и т.д.)
//   2. Управляет аккаунтами: регистрация, вход, выход
//   3. Хранит пользователей в users.json, сессии — в памяти сервера

const express = require('express');       // веб-фреймворк
const session = require('express-session'); // работа с cookie-сессиями
const crypto  = require('crypto');         // встроенный модуль Node.js для хеширования
const fs      = require('fs');             // встроенный модуль для работы с файлами
const path    = require('path');           // встроенный модуль для путей

const app  = express();
const PORT = 3000;

// Путь к файлу с пользователями
const USERS_FILE = path.join(__dirname, 'users.json');

// ─── Вспомогательные функции ────────────────────────────────────────────────

// Читает массив пользователей из users.json
// Если файл не существует или сломан — возвращает пустой массив
function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

// Сохраняет массив пользователей обратно в users.json
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Хеширует пароль через SHA-256 с солью (имя пользователя как соль).
// Без соли одинаковые пароли давали бы одинаковые хеши, что упрощает атаку по словарю.
// Примечание: смена алгоритма делает недействительными пароли существующих пользователей.
// В реальном проекте используйте bcrypt: npm install bcrypt.
function hashPassword(password, username) {
  return crypto.createHash('sha256').update(username + ':' + password).digest('hex');
}

// ─── Middleware (обработчики, которые запускаются для каждого запроса) ───────

// Разрешаем серверу читать JSON из тела запроса (нужно для POST /login и /register)
app.use(express.json());

// Раздаём все статические файлы из текущей папки:
// index.html, chess.js, ui.js, styles.css, auth.html, auth.js
app.use(express.static(__dirname));

// Настраиваем сессии.
// Сессия — это данные на сервере, привязанные к конкретному браузеру через cookie.
// Когда пользователь входит, мы записываем req.session.username = "vasya".
// При следующих запросах с того же браузера — имя сохраняется автоматически.
// Секрет сессии: берём из переменной окружения SESSION_SECRET или используем запасной.
// Чтобы задать переменную локально: SESSION_SECRET=my-secret npm start
const SESSION_SECRET = process.env.SESSION_SECRET || 'chess-secret-key-change-in-production';

app.use(session({
  secret: SESSION_SECRET, // ключ подписи cookie
  resave: false,           // не пересохранять сессию, если она не изменилась
  saveUninitialized: false, // не создавать пустые сессии для анонимных пользователей
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // сессия живёт 7 дней
    httpOnly: true,                   // cookie недоступна из JavaScript (защита от XSS)
  },
}));

// ─── Роуты (обработчики конкретных URL) ─────────────────────────────────────

// GET /analysis — страница анализа завершённой партии
app.get('/analysis', (req, res) => {
  res.sendFile(path.join(__dirname, 'analysis.html'));
});

// GET /me — кто сейчас вошёл?
// Используется при загрузке страницы, чтобы проверить авторизацию
app.get('/me', (req, res) => {
  if (req.session.username) {
    res.json({ username: req.session.username });
  } else {
    res.status(401).json({ error: 'Не авторизован' });
  }
});

// POST /register — регистрация нового пользователя
// Тело запроса: { username: "vasya", password: "secret" }
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Валидация: проверяем, что поля заполнены и достаточно длинные
  if (!username || !password) {
    return res.status(400).json({ error: 'Заполни все поля' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Имя минимум 3 символа' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  }

  const users = readUsers();

  // Проверяем, что имя ещё не занято
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Имя уже занято' });
  }

  // Сохраняем нового пользователя (пароль — только хеш, не сам пароль!)
  users.push({ username, password: hashPassword(password, username) });
  saveUsers(users);

  // Сразу входим — пользователь не должен вводить данные второй раз
  req.session.username = username;
  res.json({ username });
});

// POST /login — вход в систему
// Тело запроса: { username: "vasya", password: "secret" }
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Заполни все поля' });
  }

  const users = readUsers();

  // Ищем пользователя с совпадающим именем И хешем пароля
  const user = users.find(
    u => u.username === username && u.password === hashPassword(password, username)
  );

  if (!user) {
    // Намеренно не говорим, что именно неверно — имя или пароль (безопаснее)
    return res.status(401).json({ error: 'Неверное имя или пароль' });
  }

  // Записываем имя пользователя в сессию
  req.session.username = username;
  res.json({ username });
});

// POST /logout — выход из системы
app.post('/logout', (req, res) => {
  // Уничтожаем сессию на сервере и удаляем cookie в браузере
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// ─── Запуск ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nСервер запущен → http://localhost:${PORT}\n`);
});
