const channel = new BroadcastChannel("betha-logs-fix");

const TS = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\S*)\s?(.*)$/;
const ERROR = /(Exception|Error|\[wrapped\]|ERRO)/;
// pacotes da Betha ficam destacados dentro do stack trace
const APP_FRAME = /^at com\.betha\./;

const logEl = document.getElementById("log");
const search = document.getElementById("search");
const onlyErrors = document.getElementById("only-errors");
const expand = document.getElementById("expand");
const status = document.getElementById("status");

let rows = []; // {el, text, error, group}

function makeLine(ts, msg) {
    const line = document.createElement("div");
    line.className = "line";
    const tsEl = document.createElement("span");
    tsEl.className = "ts";
    tsEl.textContent = ts;
    const msgEl = document.createElement("span");
    msgEl.className = "msg";
    msgEl.textContent = msg;
    line.append(tsEl, msgEl);
    return line;
}

function render(text) {
    const frag = document.createDocumentFragment();
    let group = null; // <details> do stack trace atual
    let lastError = false;
    rows = [];

    for (const raw of text.split(/\r?\n/)) {
        const m = raw.match(TS);
        const ts = m ? m[1] : "";
        const msg = m ? m[2] : raw;
        const isFrame = /^\s*at /.test(msg) || /^\s*\.\.\. \d+ more/.test(msg);
        const line = makeLine(ts, msg);

        if (isFrame) {
            if (!group) {
                group = document.createElement("details");
                group.className = "stack";
                group.open = expand.checked;
                group.append(document.createElement("summary"));
                group.count = 0;
                frag.append(group);
            }
            if (APP_FRAME.test(msg.trim())) line.classList.add("app");
            group.append(line);
            group.count++;
            group.firstChild.textContent = `${group.count} linha(s) de stack trace`;
            rows.push({el: line, text: raw.toLowerCase(), error: lastError, group});
            continue;
        }

        group = null;
        lastError = ERROR.test(msg);
        if (lastError) line.classList.add("error");
        frag.append(line);
        rows.push({el: line, text: raw.toLowerCase(), error: lastError, group: null});
    }

    logEl.replaceChildren(frag);
    applyFilters();
}

function highlight(row, term) {
    const msgEl = row.el.querySelector(".msg");
    const text = msgEl.textContent;
    if (!term) {
        if (msgEl.querySelector("mark")) msgEl.textContent = text;
        return;
    }
    const lower = text.toLowerCase();
    const parts = [];
    let i = 0, j;
    while ((j = lower.indexOf(term, i)) !== -1) {
        parts.push(document.createTextNode(text.slice(i, j)));
        const mark = document.createElement("mark");
        mark.textContent = text.slice(j, j + term.length);
        parts.push(mark);
        i = j + term.length;
    }
    parts.push(document.createTextNode(text.slice(i)));
    msgEl.replaceChildren(...parts);
}

function applyFilters() {
    const term = search.value.trim().toLowerCase();
    const groupsVisible = new Set();
    let shown = 0;

    for (const row of rows) {
        const visible = (!term || row.text.includes(term)) && (!onlyErrors.checked || row.error);
        row.el.classList.toggle("hidden", !visible);
        highlight(row, visible ? term : "");
        if (visible) {
            shown++;
            if (row.group) groupsVisible.add(row.group);
        }
    }

    for (const g of logEl.querySelectorAll(".stack")) {
        g.classList.toggle("hidden", !groupsVisible.has(g));
        // busca abre o stack que contém o termo
        if (term && groupsVisible.has(g)) g.open = true;
    }

    status.textContent = `${shown} de ${rows.length} linhas`;
}

let timer;
search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(applyFilters, 150);
});
onlyErrors.addEventListener("change", applyFilters);
expand.addEventListener("change", () => {
    for (const g of logEl.querySelectorAll(".stack")) g.open = expand.checked;
});

const listener = (e) => {
    render(e.data);
    channel.removeEventListener("message", listener);
};

channel.addEventListener("message", listener);
