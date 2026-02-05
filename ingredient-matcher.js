// ingredient-matcher.js
(function () {
  const DEFAULTS = {
    fetchUrl: 'recipes.json',
    containerId: 'ingredient-matcher',
    pantry: new Set([
      'is', 'is i shaker', 'krossad is', 'sodavatten', 'soda', 'tonic', 'salt', 'socker', 'sockerlag',
      'demerarasirap', 'honung', 'honungssirap', 'sirap', 'kanel', 'muskot', 'peppar', 'salt & peppar',
      'angostura', 'bitters', 'pechauds', 'pechaud’s', 'absint (skölj glas)', 'absint', 'grädde', 'äggvita', 'aquafaba',
      'äggula', 'vatten', 'lemonad', 'ginger ale', 'ginger beer', 'cola', 'apelsinblomsvatten',
      'apelsinzest', 'citronzest', 'limeskiva', 'citronklyfta', 'myntakvist', 'rosmaringren', 'gurkband',
      'apelsinskiva', 'körsbär', 'kanelstång', 'frysta lingon', 'lingon', 'grankvist', 'basilikablad',
      'äppelskiva', 'persika', 'jordgubbar', 'blåbär', 'hjortron',
      'toppa', 'float', 'stänk',
    ]),
    synonyms: new Map(Object.entries({
      'lime': 'limejuice', 'lime juice': 'limejuice', 'limesaft': 'limejuice',
      'citron': 'citronjuice', 'lemon': 'citronjuice',
      'sockerlag 1:1': 'sockerlag', 'sockerlag 2:1': 'sockerlag',
      'prosecco': 'mousserande vin', 'champagne': 'mousserande vin', 'cava': 'mousserande vin',
      'aperol': 'aperitif (bitter)', 'campari': 'aperitif (bitter)',
      'bubbel': 'mousserande vin', 'soda': 'sodavatten', 'sodavatten': 'sodavatten',
      'gin 0%': 'gin (alkoholfri)', 'alkoholfri gin': 'gin (alkoholfri)',
      'whisky': 'whiskey', 'rye': 'rye whiskey', 'bourbon': 'bourbon',
      'rom': 'ljus rom', 'mork rom': 'mörk rom', 'mörkrom': 'mörk rom',
      'grenadine': 'grenadin',
    }))
  };

  function norm(s) {
    return (s || '').toString().trim().toLowerCase()
      .replace(/[()*,.]/g, '')
      .replace(/\s+/g, ' ');
  }

  function normalizeName(name, synonyms) {
    const k = norm(name);
    return synonyms.get(k) || k;
  }

  function extractCoreIngredients(recipe, cfg) {
    const names = [];
    if (Array.isArray(recipe.ingredients)) {
      for (const ing of recipe.ingredients) {
        const raw = ing.name || '';
        let n = normalizeName(raw, cfg.synonyms);
        if (!n) continue;
        n = n.replace(/^toppa\s+/, '').replace(/^stänk\s+/, '');
        const parts = n.split('/').map(x => x.trim());
        for (let p of parts) {
          if (cfg.pantry.has(p)) continue;
          if (p.includes('skölj glas')) continue;
          if (p && !names.includes(p)) names.push(p);
        }
      }
    }
    return names;
  }

  function scoreRecipe(core, haveSet) {
    const have = core.filter(x => haveSet.has(x));
    const missing = core.filter(x => !haveSet.has(x));
    const score = (core.length === 0) ? 0 : have.length / core.length;
    return { score, have, missing };
  }

  function render(cfg, recipes) {
    const mount = document.getElementById(cfg.containerId);
    if (!mount) return;

    mount.innerHTML = `
      <div class="fd-card p-4 rounded-2xl shadow-lg bg-white/80 backdrop-blur">
        <h2 class="text-xl font-semibold mb-3">Hemma i skåpet</h2>
        <p class="text-sm text-gray-600 mb-2">Skriv ingredienser separerade med komma. Vi ignorerar garnityr och basvaror (socker, salt, is, m.m.).</p>
        <input id="fd-pantry-input" class="w-full border rounded-lg px-3 py-2 text-base" placeholder="t.ex. gin, limejuice, sockerlag, äppelmust, tequila" />
        <div class="flex items-center gap-3 mt-2">
          <label class="text-sm text-gray-700"><input type="checkbox" id="fd-show-near" class="mr-2" checked> Visa även 'nära' (saknar max 1 ingrediens)</label>
          <button id="fd-run" class="ml-auto px-4 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100">Hitta drinkar</button>
        </div>
      </div>
      <div id="fd-results" class="mt-4 space-y-3"></div>
    `;

    function run() {
      const raw = document.getElementById('fd-pantry-input').value || '';
      const near = document.getElementById('fd-show-near').checked;
      const haveList = raw.split(',').map(s => normalizeName(s, cfg.synonyms)).filter(Boolean);
      const haveSet = new Set(haveList);

      const rows = [];
      for (const r of recipes) {
        const core = extractCoreIngredients(r, cfg);
        const { score, have, missing } = scoreRecipe(core, haveSet);
        const isOk = score === 1 || (near && missing.length <= 1 && core.length > 0);
        if (!isOk) continue;
        rows.push({ r, score, have, missing, core });
      }
      rows.sort((a, b) => b.score - a.score || a.missing.length - b.missing.length || a.r.name.localeCompare(b.r.name));

      const res = document.getElementById('fd-results');
      if (rows.length === 0) {
        res.innerHTML = '<div class="text-gray-700">Inga träffar ännu – lägg till fler ingredienser eller slå på "Visa även nära".</div>';
        return;
      }
      res.innerHTML = rows.map(({ r, score, have, missing }) => {
        const pct = Math.round(score * 100);
        const haveTxt = have.length ? `<span class="text-emerald-700">har: ${have.join(', ')}</span>` : '';
        const missTxt = missing.length ? `<span class="text-amber-700">saknas: ${missing.join(', ')}</span>` : '<span class="text-emerald-700">komplett ✓</span>';
        return `
          <div class="fd-card p-4 rounded-xl bg-white/85 border">
            <div class="flex items-baseline justify-between gap-4">
              <div class="text-lg font-semibold">${r.name}</div>
              <div class="text-sm text-gray-600">${pct}% match</div>
            </div>
            <div class="text-sm mt-1 text-gray-800">${haveTxt} ${haveTxt && missTxt ? ' • ' : ''} ${missTxt}</div>
            <div class="mt-2 text-xs text-gray-600">Glas: ${r.glass || '-'} • Is: ${r.ice || '-'}</div>
          </div>
        `;
      }).join('');
    }

    document.getElementById('fd-run').addEventListener('click', run);
  }

  async function init(cfg) {
    const config = Object.assign({}, DEFAULTS, cfg || {});
    try {
      const res = await fetch(config.fetchUrl);
      const recipes = await res.json();
      render(config, recipes);
    } catch (e) {
      console.error('Ingredient matcher init failed', e);
      const mount = document.getElementById(config.containerId);
      if (mount) mount.innerHTML = '<div class="text-red-700">Kunde inte läsa receptfilen.</div>';
    }
  }

  window.initIngredientMatcher = init;
})();
