// auth.js — логика страницы входа и регистрации (auth.html)
//
// Что делает этот файл:
//   1. При загрузке проверяет, не вошёл ли пользователь уже (и тогда сразу отправляет на главную)
//   2. Переключает вкладки "Вход" / "Регистрация"
//   3. Отправляет данные формы на сервер через fetch
//   4. Показывает ошибки под формой или делает редирект при успехе

// ─── Проверка при загрузке ───────────────────────────────────────────────────

// Если пользователь уже авторизован — не показываем форму, сразу переходим на главную
fetch('/me')
  .then(res => {
    if (res.ok) window.location.href = '/';
  })
  .catch(() => {
    // Сервер недоступен — просто показываем форму, ничего не делаем
  });

// Браузеры (Chrome, Safari) игнорируют autocomplete="off" для форм входа.
// Надёжный обход: держим поля readonly — браузер не автозаполняет их.
// При первом фокусе снимаем readonly, чтобы пользователь мог печатать.
['login-username', 'login-password'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('focus', () => el.removeAttribute('readonly'), { once: true });
});

// ─── Глазик в поле пароля ────────────────────────────────────────────────────

// Подключает логику глазика к паре (поле пароля, кнопка).
// Закрытый глаз = пароль скрыт (по умолчанию).
// Открытый глаз  = пароль виден.
// Кнопка появляется при вводе первого символа и исчезает при очистке поля.
function initEye(inputId, eyeBtnId) {
  const input      = document.getElementById(inputId);
  const btn        = document.getElementById(eyeBtnId);
  const iconOpen   = btn.querySelector('.eye-icon--open');
  const iconClosed = btn.querySelector('.eye-icon--closed');

  // Показываем / скрываем кнопку в зависимости от наличия текста
  input.addEventListener('input', () => {
    if (input.value.length > 0) {
      btn.classList.remove('hidden');
    } else {
      // Поле очищено: скрываем кнопку и сбрасываем в исходное состояние
      btn.classList.add('hidden');
      input.type = 'password';
      iconOpen.classList.add('hidden');
      iconClosed.classList.remove('hidden');
      btn.setAttribute('aria-label', 'Показать пароль');
    }
  });

  // Клик: переключаем видимость пароля и иконку
  // Закрытый глаз → клик → пароль видно, показываем открытый глаз
  // Открытый глаз → клик → пароль скрыт, показываем закрытый глаз
  btn.addEventListener('click', () => {
    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    iconOpen.classList.toggle('hidden', isVisible);    // открытый = только когда видно
    iconClosed.classList.toggle('hidden', !isVisible); // закрытый = только когда скрыто
    btn.setAttribute('aria-label', isVisible ? 'Показать пароль' : 'Скрыть пароль');
  });
}

initEye('login-password', 'login-eye');
initEye('reg-password',   'reg-eye');

// ─── Переключение вкладок ────────────────────────────────────────────────────

// Показывает нужную форму и подсвечивает активный таб
function showTab(tab) {
  const isLogin = tab === 'login';

  document.getElementById('form-login').classList.toggle('hidden', !isLogin);
  document.getElementById('form-register').classList.toggle('hidden', isLogin);

  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);

  // Сбрасываем ошибки при переключении
  hideError('login-error');
  hideError('register-error');
}

// ─── Утилиты для отображения ошибок ─────────────────────────────────────────

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideError(elementId) {
  document.getElementById(elementId).classList.add('hidden');
}

// Блокирует/разблокирует кнопку во время отправки запроса
function setLoading(buttonId, isLoading) {
  const btn = document.getElementById(buttonId);
  btn.disabled = isLoading;
  btn.textContent = isLoading ? 'Загрузка...' : btn.dataset.label;
}

// Запоминаем исходный текст кнопок, чтобы восстанавливать при setLoading
document.getElementById('login-submit').dataset.label    = 'Войти';
document.getElementById('register-submit').dataset.label = 'Создать аккаунт';

// ─── Отправка форм ───────────────────────────────────────────────────────────

// Вход: отправляем имя и пароль, при успехе переходим на главную
async function handleLogin(event) {
  event.preventDefault(); // останавливаем стандартную отправку формы
  hideError('login-error');
  setLoading('login-submit', true);

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res  = await fetch('/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (res.ok) {
      window.location.href = '/'; // успех — идём играть
    } else {
      showError('login-error', data.error);
    }
  } catch {
    showError('login-error', 'Не удалось подключиться к серверу');
  } finally {
    setLoading('login-submit', false);
  }
}

// Регистрация: создаём аккаунт и сразу входим
async function handleRegister(event) {
  event.preventDefault();
  hideError('register-error');
  setLoading('register-submit', true);

  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;

  try {
    const res  = await fetch('/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (res.ok) {
      window.location.href = '/'; // успех — идём играть
    } else {
      showError('register-error', data.error);
    }
  } catch {
    showError('register-error', 'Не удалось подключиться к серверу');
  } finally {
    setLoading('register-submit', false);
  }
}
