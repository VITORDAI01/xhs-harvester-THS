const sinceInput = document.querySelector("#since");
const loginButton = document.querySelector("#login");
const runButton = document.querySelector("#run");
const stopButton = document.querySelector("#stop");
const clearButton = document.querySelector("#clear");
const refreshButton = document.querySelector("#refresh");
const logsEl = document.querySelector("#logs");
const outputsEl = document.querySelector("#outputs");
const statusEl = document.querySelector("#status");

let logs = [];

loginButton.addEventListener("click", async () => {
  await postJson("/api/login", {});
});

runButton.addEventListener("click", async () => {
  const since = sinceInput.value.trim();
  if (!since) {
    appendLocalLog("请输入起始日期。");
    sinceInput.focus();
    return;
  }

  const result = await postJson("/api/crawl", { since });
  if (result?.error) appendLocalLog(result.error);
});

stopButton.addEventListener("click", async () => {
  await postJson("/api/stop", {});
});

clearButton.addEventListener("click", () => {
  logs = [];
  renderLogs();
});

refreshButton.addEventListener("click", loadOutputs);

const events = new EventSource("/api/events");
events.onmessage = (event) => {
  const payload = JSON.parse(event.data);

  if (payload.type === "log") {
    logs.push(payload.line);
    logs = logs.slice(-600);
    renderLogs();
    return;
  }

  if (payload.type === "status") {
    logs = payload.logs || logs;
    renderLogs();
    setRunning(Boolean(payload.running), Boolean(payload.loginRunning));
    return;
  }

  if (payload.type === "outputs") {
    renderOutputs(payload.files || []);
  }
};

await loadStatus();
await loadOutputs();

async function loadStatus() {
  const status = await fetchJson("/api/status");
  logs = status.logs || [];
  renderLogs();
  setRunning(Boolean(status.running), Boolean(status.loginRunning));
}

async function loadOutputs() {
  const data = await fetchJson("/api/outputs");
  renderOutputs(data.files || []);
}

async function postJson(url, body) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok && data.error) appendLocalLog(data.error);
    return data;
  } catch (error) {
    appendLocalLog(error.message || String(error));
    return null;
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  return response.json();
}

function setRunning(running, loginRunning) {
  runButton.disabled = running || loginRunning;
  stopButton.disabled = !running;
  loginButton.disabled = loginRunning;
  statusEl.classList.toggle("running", running || loginRunning);
  statusEl.textContent = running ? "爬取中" : loginRunning ? "登录中" : "待命";
}

function appendLocalLog(line) {
  logs.push(line);
  logs = logs.slice(-600);
  renderLogs();
}

function renderLogs() {
  logsEl.textContent = logs.join("\n");
  logsEl.scrollTop = logsEl.scrollHeight;
}

function renderOutputs(files) {
  if (!files.length) {
    outputsEl.innerHTML = `<div class="empty">暂无导出文件</div>`;
    return;
  }

  outputsEl.replaceChildren(...files.map((file) => {
    const link = document.createElement("a");
    link.className = "output-link";
    link.href = file.href;

    const name = document.createElement("div");
    name.className = "output-name";
    name.textContent = file.name;

    const meta = document.createElement("div");
    meta.className = "output-meta";
    meta.textContent = `${formatSize(file.size)} · ${formatTime(file.updatedAt)}`;

    link.append(name, meta);
    return link;
  }));
}

function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
