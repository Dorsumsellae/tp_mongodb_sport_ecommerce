function highlightJSON(json) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc(json).replace(
    /("(?:\\.|[^"\\])*")\s*:/g,
    '<span class="syn-key">$1</span>:'
  ).replace(
    /:\s*("(?:\\.|[^"\\])*")/g,
    (m, str) => ': <span class="syn-str">' + str + '</span>'
  ).replace(
    /:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    ': <span class="syn-num">$1</span>'
  ).replace(
    /:\s*(true|false)/g,
    ': <span class="syn-bool">$1</span>'
  ).replace(
    /:\s*(null)/g,
    ': <span class="syn-null">$1</span>'
  ).replace(
    /([[\]{}])/g,
    '<span class="syn-bracket">$1</span>'
  );
}

function highlightMongo(query) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const tokens = [];
  // Extract strings first to protect them from further replacements
  let escaped = esc(query).replace(/("(?:\\.|[^"\\])*")/g, (m) => {
    tokens.push('<span class="syn-str">' + m + '</span>');
    return '\x00T' + (tokens.length - 1) + '\x00';
  });
  escaped = escaped
    .replace(
      /\b(db)\.(\w+)\.(find|findOne|aggregate|countDocuments|distinct|insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|replaceOne|sort|limit|skip|project|match|group|unwind|lookup|addFields|set|count)\b/g,
      '<span class="syn-null">$1</span>.<span class="syn-collection">$2</span>.<span class="syn-method">$3</span>'
    )
    .replace(
      /\.(sort|limit|skip|project|match|group|unwind|lookup|addFields|set|count)\b/g,
      '.<span class="syn-method">$1</span>'
    )
    .replace(
      /(\$\w+)/g,
      '<span class="syn-operator">$1</span>'
    )
    .replace(
      /:\s*(-?\d+(?:\.\d+)?)/g,
      ': <span class="syn-num">$1</span>'
    )
    .replace(
      /:\s*(true|false)/g,
      ': <span class="syn-bool">$1</span>'
    )
    .replace(
      /:\s*(null)\b/g,
      ': <span class="syn-null">$1</span>'
    );
  // Restore string tokens
  return escaped.replace(/\x00T(\d+)\x00/g, (_, i) => tokens[i]);
}

document.addEventListener("DOMContentLoaded", async () => {
  const domainFilters = document.getElementById("domain-filters");
  const queryList = document.getElementById("query-list");
  const resultPanel = document.getElementById("result-panel");
  const resultTitle = document.getElementById("result-title");
  const resultQuery = document.querySelector("#result-query code");
  const resultDuration = document.getElementById("result-duration");
  const resultCount = document.getElementById("result-count");
  const resultData = document.querySelector("#result-data code");
  const closeResult = document.getElementById("close-result");

  const historyList = document.getElementById("history-list");
  const clearHistoryBtn = document.getElementById("clear-history");
  const MAX_HISTORY = 30;

  function getHistory() {
    try { return JSON.parse(localStorage.getItem("queryHistory") || "[]"); }
    catch { return []; }
  }

  function saveToHistory(queryText) {
    const history = getHistory();
    // Avoid consecutive duplicates
    if (history.length > 0 && history[0].query === queryText) return;
    history.unshift({ query: queryText, time: Date.now() });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem("queryHistory", JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();
    historyList.innerHTML = "";
    if (history.length === 0) {
      historyList.innerHTML = '<div style="font-size:0.7rem;color:var(--text-muted);padding:0.4rem 0.6rem;opacity:0.5">Aucune requete</div>';
      return;
    }
    for (const entry of history) {
      const btn = document.createElement("button");
      btn.className = "history-item";
      const date = new Date(entry.time);
      const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      const dateStr = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      btn.innerHTML = `<span class="history-time">${dateStr} ${timeStr}</span>${entry.query.replace(/</g, "&lt;").replace(/>/g, "&gt;")}`;
      btn.title = entry.query;
      btn.addEventListener("click", () => {
        customQueryEl.value = entry.query;
        autoResize();
        customQueryEl.focus();
      });
      historyList.appendChild(btn);
    }
  }

  clearHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem("queryHistory");
    renderHistory();
  });

  let queries = [];
  let activeDomain = null;

  // Fetch query definitions
  const res = await fetch("/api/queries");
  queries = await res.json();

  // Build domain list
  const domains = [...new Set(queries.map((q) => q.domain))];
  const allBtn = createDomainButton("Toutes", queries.length);
  allBtn.classList.add("active");
  allBtn.addEventListener("click", () => filterByDomain(null));
  domainFilters.appendChild(allBtn);

  for (const domain of domains) {
    const count = queries.filter((q) => q.domain === domain).length;
    const btn = createDomainButton(domain, count);
    btn.dataset.domain = domain;
    btn.addEventListener("click", () => filterByDomain(domain));
    domainFilters.appendChild(btn);
  }

  function createDomainButton(label, count) {
    const btn = document.createElement("button");
    btn.className = "domain-btn";
    btn.innerHTML = `${label} <span class="count">${count}</span>`;
    return btn;
  }

  function filterByDomain(domain) {
    activeDomain = domain;
    document.querySelectorAll(".domain-btn").forEach((btn) => {
      const isDomainMatch = domain === null
        ? !btn.dataset.domain
        : btn.dataset.domain === domain;
      btn.classList.toggle("active", isDomainMatch);
    });
    renderQueries();
  }

  async function runQuery(query, card) {
    // Highlight active card
    document.querySelectorAll(".query-card").forEach((c) => c.classList.remove("active"));
    card.classList.add("active");

    // Show panel with loading state
    resultPanel.classList.remove("hidden");
    resultTitle.textContent = query.title;
    resultQuery.innerHTML = highlightMongo(query.mongoQuery);
    resultDuration.innerHTML = '<span class="loading"></span> Execution...';
    resultCount.textContent = "";
    resultData.textContent = "";
    saveToHistory(query.mongoQuery);

    try {
      const res = await fetch(`/api/queries/${query.id}/run`);
      const data = await res.json();

      if (data.error) {
        resultDuration.textContent = "Erreur";
        resultData.textContent = data.error;
        return;
      }

      resultDuration.innerHTML = `Duree : <strong>${data.duration_ms} ms</strong>`;
      resultCount.innerHTML = `Documents : <strong>${data.count}</strong>`;
      resultData.innerHTML = highlightJSON(JSON.stringify(data.result, null, 2));
    } catch (err) {
      resultDuration.textContent = "Erreur reseau";
      resultData.textContent = err.message;
    }

    // Scroll to result
    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  closeResult.addEventListener("click", () => {
    resultPanel.classList.add("hidden");
    document.querySelectorAll(".query-card").forEach((c) => c.classList.remove("active"));
  });

  // -- Custom query editor -------------------------------------------------------

  const customQueryEl = document.getElementById("custom-query");
  const runCustomBtn = document.getElementById("run-custom");
  const collectionHint = document.getElementById("collection-hint");

  // Auto-resize textarea to fit content
  function autoResize() {
    customQueryEl.style.height = "auto";
    customQueryEl.style.height = Math.max(120, customQueryEl.scrollHeight) + "px";
  }
  customQueryEl.addEventListener("input", autoResize);

  // Populate collection dropdown dynamically
  const colRes = await fetch("/api/collections");
  const collections = await colRes.json();
  for (const col of collections) {
    const opt = document.createElement("option");
    opt.value = col;
    opt.textContent = col;
    collectionHint.appendChild(opt);
  }

  collectionHint.addEventListener("change", () => {
    if (!collectionHint.value) return;
    const current = customQueryEl.value.trim();
    if (!current || current === customQueryEl.placeholder) {
      customQueryEl.value = `db.${collectionHint.value}.find({})`;
    } else {
      // Replace collection name in existing query
      customQueryEl.value = current.replace(
        /^(db\.)(\w+)(\.)/,
        `$1${collectionHint.value}$3`
      );
    }
    customQueryEl.focus();
    autoResize();
    collectionHint.value = "";
  });

  async function runCustomQuery() {
    const raw = customQueryEl.value.trim();
    if (!raw) return;

    document.querySelectorAll(".query-card").forEach((c) => c.classList.remove("active"));

    resultPanel.classList.remove("hidden");
    resultTitle.textContent = "Requete personnalisee";
    resultQuery.innerHTML = highlightMongo(raw);
    resultDuration.innerHTML = '<span class="loading"></span> Execution...';
    resultCount.textContent = "";
    resultData.textContent = "";
    saveToHistory(raw);

    try {
      const res = await fetch("/api/custom-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: raw }),
      });
      const data = await res.json();

      if (data.error) {
        resultDuration.textContent = "Erreur";
        resultData.textContent = data.error;
        return;
      }

      resultDuration.innerHTML = `Duree : <strong>${data.duration_ms} ms</strong>`;
      resultCount.innerHTML = `Documents : <strong>${data.count}</strong>`;
      resultData.innerHTML = highlightJSON(JSON.stringify(data.result, null, 2));
    } catch (err) {
      resultDuration.textContent = "Erreur reseau";
      resultData.textContent = err.message;
    }

    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  runCustomBtn.addEventListener("click", runCustomQuery);

  customQueryEl.addEventListener("keydown", (e) => {
    // Ctrl+Enter or Cmd+Enter to run
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runCustomQuery();
    }
    // Tab inserts 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const start = customQueryEl.selectionStart;
      const end = customQueryEl.selectionEnd;
      customQueryEl.value =
        customQueryEl.value.substring(0, start) + "  " + customQueryEl.value.substring(end);
      customQueryEl.selectionStart = customQueryEl.selectionEnd = start + 2;
    }
  });

  // Clicking a predefined query also fills the editor
  const origRunQuery = runQuery;
  async function runQueryAndFill(query, card) {
    customQueryEl.value = query.mongoQuery;
    autoResize();
    await origRunQuery(query, card);
  }

  function renderQueries() {
    const filtered = activeDomain
      ? queries.filter((q) => q.domain === activeDomain)
      : queries;

    queryList.innerHTML = "";
    for (const query of filtered) {
      const card = document.createElement("div");
      card.className = "query-card";
      card.dataset.id = query.id;
      card.innerHTML = `
        <span class="domain-tag" data-domain="${query.domain}">${query.domain}</span>
        <h3>${query.title}</h3>
        <p>${query.description}</p>
      `;
      card.addEventListener("click", () => runQueryAndFill(query, card));
      queryList.appendChild(card);
    }
  }

  // Initial render
  renderQueries();
  renderHistory();
});
