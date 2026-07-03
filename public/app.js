// Frontend logic for the module-test console. External file (not inline) so it satisfies the
// app's helmet CSP: `script-src 'self'` blocks inline <script>, and `script-src-attr 'none'`
// blocks inline onclick handlers — hence addEventListener wiring here.
let token = '';
const logEl = document.getElementById('log');
const $ = (id) => document.getElementById(id);

function log(label, data, ok = true) {
  const time = new Date().toLocaleTimeString();
  logEl.textContent =
    `[${time}] ${ok ? '✓' : '✗'} ${label}\n` +
    (typeof data === 'string' ? data : JSON.stringify(data, null, 2)) +
    '\n\n' +
    logEl.textContent;
}

function setToken(t) {
  token = t || '';
  const s = $('tokState');
  s.textContent = token ? 'token set' : 'no token';
  s.className = 'pill ' + (token ? 'ok' : 'bad');
}

async function api(method, path, body, auth) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  log(`${method} ${path} → ${res.status}`, data, res.ok);
  return { res, data };
}

const creds = () => ({
  email: $('email').value,
  password: $('password').value,
});

const handlers = {
  register: async () => {
    const { data } = await api('POST', '/auth/register', creds(), false);
    if (data && data.accessToken) setToken(data.accessToken);
  },
  login: async () => {
    const { data } = await api('POST', '/auth/login', creds(), false);
    if (data && data.accessToken) setToken(data.accessToken);
  },
  me: () => api('GET', '/auth/me', null, true),
  createOrder: async () => {
    const body = {
      customer: $('customer').value,
      item: $('item').value,
      quantity: Number($('quantity').value),
      amount: Number($('amount').value),
    };
    const { data } = await api('POST', '/orders', body, true);
    if (data && data.id) $('orderId').value = data.id;
  },
  listOrders: () => api('GET', '/orders', null, false),
  getOrder: () =>
    api(
      'GET',
      '/orders/' + encodeURIComponent($('orderId').value),
      null,
      false,
    ),
  clear: () => {
    logEl.textContent = '';
  },
};

document.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', () => handlers[btn.dataset.action]());
});

(async () => {
  try {
    const res = await fetch('/health');
    const h = $('health');
    h.textContent = res.ok ? 'ok' : 'down';
    h.className = 'pill ' + (res.ok ? 'ok' : 'bad');
  } catch {
    /* leave as unknown */
  }
})();
