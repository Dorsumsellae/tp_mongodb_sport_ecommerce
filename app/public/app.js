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
    resultQuery.textContent = query.mongoQuery;
    resultDuration.innerHTML = '<span class="loading"></span> Execution...';
    resultCount.textContent = "";
    resultData.textContent = "";

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
      resultData.textContent = JSON.stringify(data.result, null, 2);
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
    resultQuery.textContent = raw;
    resultDuration.innerHTML = '<span class="loading"></span> Execution...';
    resultCount.textContent = "";
    resultData.textContent = "";

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
      resultData.textContent = JSON.stringify(data.result, null, 2);
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
});
