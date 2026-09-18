/**
 * Krishti AI V21 — lightweight usage/plan UI.
 * This is intentionally independent of the existing V20 chat code.
 */
(() => {
  const root = document.createElement("section");
  root.id = "v21AccountPanel";
  root.className = "v21-panel";
  root.innerHTML = `
    <div class="v21-panel-head">
      <div><span class="v21-kicker">KRISHTI AI V21</span><h2>Your plan & usage</h2></div>
      <button class="v21-close" aria-label="Close">×</button>
    </div>
    <div class="v21-plan-grid">
      <article class="v21-plan"><b>Free</b><span>₹0</span><p>50 messages/month</p><p>Ads supported</p></article>
      <article class="v21-plan featured"><b>Pro Monthly</b><span>₹299/month</span><p>2,000 messages/month</p><p>Ad-free + premium limits</p></article>
      <article class="v21-plan"><b>Pro Yearly</b><span>₹2,988/year</span><p>₹249/month equivalent</p><p>Ad-free + premium limits</p></article>
    </div>
    <div class="v21-usage" id="v21UsageList"><div class="v21-loading">Loading usage…</div></div>
    <p class="v21-note">Limits are enforced by the backend. Final commercial prices and quotas should be reviewed against your real API cost before launch.</p>
  `;
  document.body.appendChild(root);
  root.querySelector(".v21-close").onclick = () => root.classList.remove("open");

  window.KrishtiV21 = {
    openAccount() { root.classList.add("open"); },
    renderUsage(data) {
      const list = root.querySelector("#v21UsageList");
      const labels = {messages:"Text messages",images:"Images",voice:"Voice",pdf:"PDF / files",webSearch:"Web search",premiumModels:"Premium models"};
      const used = data?.used || {};
      const limits = data?.limits || {};
      list.innerHTML = Object.keys(labels).map(k => {
        const u = Number(used[k] || 0), l = Number(limits[k] || 0);
        const pct = l ? Math.min(100, Math.round(u/l*100)) : 0;
        return `<div class="v21-meter"><div><span>${labels[k]}</span><b>${u} / ${l}</b></div><i><em style="width:${pct}%"></em></i></div>`;
      }).join("");
    }
  };

  async function loadUsage() {
    try {
      const token = window.firebaseAuth?.currentUser ? await window.firebaseAuth.currentUser.getIdToken() : "";
      const r = await fetch("/api/v21/usage", {headers: token ? {Authorization:`Bearer ${token}`} : {}});
      if (!r.ok) throw new Error("usage");
      const data = await r.json();
      window.KrishtiV21.renderUsage(data);
    } catch {
      root.querySelector("#v21UsageList").innerHTML = `<div class="v21-loading">Sign in to view your usage.</div>`;
    }
  }
  window.KrishtiV21.loadUsage = loadUsage;
  document.addEventListener("click", e => {
    if (e.target.closest("[data-v21-account]")) { root.classList.add("open"); loadUsage(); }
  });
})();
