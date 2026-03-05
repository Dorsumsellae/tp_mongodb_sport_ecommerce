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
      card.addEventListener("click", () => runQuery(query, card));
      queryList.appendChild(card);
    }
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

  // Initial render
  renderQueries();
});
