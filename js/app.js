'use strict';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const ROTATION_EPOCH = new Date(2026, 5, 15); // Monday 15 June 2026 = week 0 day 0
const MONTHLY_BUDGET = 250;
const DAY_NAMES  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_FULL   = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MONTH_NAMES= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Mon=work, Tue=day off, Wed=batch day (day off), Thu-Sun=work
const DAY_IS_OFF  = [false, true,  true,  false, false, false, false];
const DAY_IS_BATCH= [false, false, true,  false, false, false, false];
// How many dinner portions to make each night (extra = next-day packed lunch).
// Batch dinners are already 4-serving recipes — app multiplies regular dinners only.
const DINNER_SERVINGS = [1, 1, 1, 2, 1, 2, 2]; // Mon Tue Wed Thu Fri Sat Sun

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let currentWeekOffset = 0; // weeks from today's rotation week
let activeView = 'calendar';
let openMealId = null;
let recipeFilter = 'all';
let recipeQuery  = '';
let recipeMode = 'mine';      // 'mine' | 'search'
let swapContext = null;       // { dayIndex, slotType, wk }
let previewMeals = {};        // in-memory, non-persisted live-search results keyed by temp id
let searchDebounceTimer = null;
let searchBrowseMode = 'name'; // 'name' | 'cuisine' | 'category' | 'ingredient'
let browseSelectedValue = null; // the chosen cuisine/category/ingredient value
let browseOptionsCache = {};    // { c: [...], a: [...], i: [...] } cached TheMealDB list values
let addRecipeType = 'breakfast'; // selected meal slot in the manual Add Recipe form

// localStorage keys
const LS_CHECKS   = 'mp_checks';   // { 'YYYY-WW': { 'item name': true } }
const LS_OFFSET   = 'mp_offset';   // saved week offset
const LS_SKIP     = 'mp_skip';     // { 'YYYY-WW': { '0-b': true, ... } } excluded meals
const LS_OVERRIDE = 'mp_override'; // { 'YYYY-WW': { '0-d': 'mealId', ... } } swapped meals
const LS_CUSTOM   = 'mp_custom';   // { mealId: mealObj } user-saved/imported recipes

// TheMealDB free public API (test key "1", no signup required)
const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1/';
const MEALDB_SEARCH_URL = MEALDB_BASE + 'search.php?s=';

// ─────────────────────────────────────────────
// DATE UTILITIES
// ─────────────────────────────────────────────
// Week display is anchored to Wednesday (shopping/prep day), not Monday.
// Meal rotation data in meals.js is still indexed Mon=0…Sun=6 internally.
function weekAnchorOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = -(((day - 3) % 7 + 7) % 7); // most recent Wednesday on/before date
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function rotationWeekFor(weekAnchor) {
  const epochAnchor = addDays(ROTATION_EPOCH, 2); // Wed of epoch week (17 Jun 2026)
  const diffMs = weekAnchor - epochAnchor;
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  return ((diffWeeks % 13) + 13) % 13;
}

function currentWeekAnchorBase() {
  return weekAnchorOf(new Date());
}

function weekAnchorFromOffset(offset) {
  const base = currentWeekAnchorBase();
  base.setDate(base.getDate() + offset * 7);
  return base;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtDate(d) {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function isToday(d) {
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

function weekKey(weekAnchor) {
  return `${weekAnchor.getFullYear()}-W${String(rotationWeekFor(weekAnchor)+1).padStart(2,'0')}-${weekAnchor.getDate()}`;
}

// ─────────────────────────────────────────────
// MEAL LOOKUP
// ─────────────────────────────────────────────
function getDayPlan(weekAnchor, dayIndex) {
  // dayIndex: 0=Mon … 6=Sun
  const rotWeek = rotationWeekFor(weekAnchor);
  const basePlan = ROTATION[rotWeek][dayIndex];
  const wk = weekKey(weekAnchor);
  const overrides = getOverrides(wk);
  const ob = overrides[dayIndex + '-b'];
  const ol = overrides[dayIndex + '-l'];
  const od = overrides[dayIndex + '-d'];
  if (!ob && !ol && !od) return basePlan; // fast path, no overrides this week
  return { b: ob || basePlan.b, l: ol || basePlan.l, d: od || basePlan.d };
}

function getMeal(id) {
  return previewMeals[id] || ALL_MEALS[id] || getCustomMeals()[id] || null;
}

// ─────────────────────────────────────────────
// SHOPPING LIST LOGIC
// ─────────────────────────────────────────────
function unitNorm(unit) {
  return (unit || '').toLowerCase().trim();
}

function buildShoppingList(weekAnchor) {
  const wk = weekKey(weekAnchor);
  const skips = getSkips(wk);
  const aggregated = {};

  for (let d = 0; d < 7; d++) {
    const plan = getDayPlan(weekAnchor, d);
    const dinner = getMeal(plan.d);
    const dinnerMult = (dinner && (dinner.batch || dinner.imported)) ? 1 : DINNER_SERVINGS[d];

    [
      [getMeal(plan.b), 1,          'b'],
      [getMeal(plan.l), 1,          'l'],
      [dinner,          dinnerMult, 'd'],
    ].forEach(([meal, mult, tc]) => {
      if (!meal || !meal.ingredients) return;
      if (skips[`${d}-${tc}`]) return;
      meal.ingredients.forEach(ing => {
        const key = ing.name.toLowerCase().trim();
        const u = unitNorm(ing.unit);
        if (!aggregated[key]) {
          aggregated[key] = { name: ing.name, unit: u, category: ing.category, qty: 0 };
        }
        if (u === aggregated[key].unit) {
          aggregated[key].qty += ing.qty * mult;
        }
      });
    });
  }

  return Object.values(aggregated).sort((a, b) => a.name.localeCompare(b.name));
}

function estimateCost(items) {
  // 2025 US retail prices. All recipe data is in American units so no conversion needed.
  let total = 10.00; // weekly pantry overhead (oils, spices, condiments)

  items.forEach(item => {
    const n = item.name.toLowerCase();
    const qty = item.qty || 0;
    const u = unitNorm(item.unit);
    let c = 0;

    if (u === 'oz') {
      if      (n.includes('chicken thigh'))            c = qty * 0.234; // $3.74/lb
      else if (n.includes('chicken'))                  c = qty * 0.28;  // $4.48/lb
      else if (n.includes('ground beef'))              c = qty * 0.344; // $5.50/lb
      else if (n.includes('beef'))                     c = qty * 0.344;
      else if (n.includes('salmon'))                   c = qty * 0.50;  // $8/lb
      else if (n.includes('greek yogurt') || n.includes('yogurt')) c = qty * 0.172; // $2.75/lb
      else if (n.includes('cheddar') || n.includes('cheese'))      c = qty * 0.35;  // $5.60/lb
      else if (n.includes('canned chickpea'))          c = (qty / 15)   * 1.25;
      else if (n.includes('canned diced tomato') || n.includes('canned tomato')) c = (qty / 14.5) * 1.25;
      else if (n.includes('black bean'))               c = (qty / 15)   * 1.00;
      else if (n.includes('canned corn') || n.includes('corn'))    c = (qty / 15)   * 0.90;
      else if (n.includes('spinach'))                  c = qty * 0.70;  // $3.50/5oz bag
      else if (n.includes('broccoli'))                 c = qty * 0.10;  // $1.60/lb
      else if (n.includes('fresh ginger') || n.includes('ginger')) c = qty * 0.35;
      else if (n.includes('pasta'))                    c = qty * 0.075; // $1.20/lb
      else                                             c = qty * 0.05;
    }
    else if (u === 'fl oz') {
      if      (n.includes('coconut milk'))             c = (qty / 13.5) * 2.00;
      else if (n.includes('heavy cream'))              c = qty * 0.35;
      else                                             c = qty * 0.10;
    }
    else if (u === 'cups') {
      if      (n.includes('basmati rice') || n.includes('rice')) c = qty * 0.22;
      else if (n.includes('rolled oat') || n.includes('oat'))    c = qty * 0.20;
      else if (n.includes('red lentil') || n.includes('lentil')) c = qty * 0.30;
      else if (n.includes('couscous'))                 c = qty * 0.30;
      else if (n.includes('granola'))                  c = qty * 1.00;
      else if (n.includes('milk'))                     c = qty * 0.50;
      else if (n.includes('greek yogurt') || n.includes('yogurt')) c = qty * 1.38;
      else if (n.includes('frozen berr') || n.includes('berr'))   c = qty * 0.80;
      else                                             c = qty * 0.25;
    }
    else if (u === 'slices') {
      if (n.includes('bread'))                         c = qty * 0.30;
    }
    else if (u === '' || u === 'count') {
      if      (n.includes('egg'))                      c = qty * 0.54; // $6.47/doz 2025
      else if (n.includes('banana'))                   c = qty * 0.25;
      else if (n.includes('avocado'))                  c = qty * 1.25;
      else if (n.includes('lemon'))                    c = qty * 0.79;
      else if (n.includes('lime'))                     c = qty * 0.50;
      else if (n.includes('onion'))                    c = qty * 0.65;
      else if (n.includes('bell pepper'))              c = qty * 1.00;
      else if (n.includes('garlic'))                   c = qty * 0.10; // per clove
      else if (n.includes('corn tortilla'))            c = qty * 0.30;
      else if (n.includes('flour tortilla') || n.includes('tortilla')) c = qty * 0.45;
      else if (n.includes('naan'))                     c = qty * 0.75;
    }
    else if (u === 'tbsp') {
      if      (n.includes('peanut butter'))            c = qty * 0.22;
      else if (n.includes('honey'))                    c = qty * 0.20;
      else if (n.includes('olive oil'))                c = qty * 0.20;
      else if (n.includes('tikka masala') || n.includes('tikka')) c = qty * 0.30;
      else if (n.includes('green curry'))              c = qty * 0.35;
      else if (n.includes('sriracha'))                 c = qty * 0.10;
      else if (n.includes('hummus'))                   c = qty * 0.15;
      else if (n.includes('salsa'))                    c = qty * 0.10;
      else if (n.includes('soy sauce'))                c = qty * 0.04;
      else if (n.includes('brown sugar'))              c = qty * 0.03;
      else if (n.includes('butter'))                   c = qty * 0.22;
      else                                             c = qty * 0.08;
    }
    else if (u === 'tsp') {
      if      (n.includes('sesame oil'))               c = qty * 0.12;
      else if (n.includes('fish sauce'))               c = qty * 0.05;
      else if (n.includes('sriracha'))                 c = qty * 0.06;
      else                                             c = qty * 0.03; // generic spice
    }

    total += c;
  });

  return Math.round(total * 100) / 100;
}

// ─────────────────────────────────────────────
// CHECKED ITEMS (local storage)
// ─────────────────────────────────────────────
function getChecks(wk) {
  const all = JSON.parse(localStorage.getItem(LS_CHECKS) || '{}');
  return all[wk] || {};
}

function setCheck(wk, itemName, val) {
  const all = JSON.parse(localStorage.getItem(LS_CHECKS) || '{}');
  if (!all[wk]) all[wk] = {};
  if (val) all[wk][itemName] = true;
  else delete all[wk][itemName];
  localStorage.setItem(LS_CHECKS, JSON.stringify(all));
}

function getSkips(wk) {
  return JSON.parse(localStorage.getItem(LS_SKIP) || '{}')[wk] || {};
}
function setSkip(wk, key, skipped) {
  const all = JSON.parse(localStorage.getItem(LS_SKIP) || '{}');
  if (!all[wk]) all[wk] = {};
  if (skipped) all[wk][key] = true;
  else delete all[wk][key];
  localStorage.setItem(LS_SKIP, JSON.stringify(all));
}

function clearChecks(wk) {
  const all = JSON.parse(localStorage.getItem(LS_CHECKS) || '{}');
  delete all[wk];
  localStorage.setItem(LS_CHECKS, JSON.stringify(all));
}

// ─────────────────────────────────────────────
// MEAL-SWAP OVERRIDES (local storage, per day-per-week)
// ─────────────────────────────────────────────
function getOverrides(wk) {
  return JSON.parse(localStorage.getItem(LS_OVERRIDE) || '{}')[wk] || {};
}

function setOverride(wk, key, mealId) {
  const all = JSON.parse(localStorage.getItem(LS_OVERRIDE) || '{}');
  if (!all[wk]) all[wk] = {};
  all[wk][key] = mealId;
  localStorage.setItem(LS_OVERRIDE, JSON.stringify(all));
}

function clearOverride(wk, key) {
  const all = JSON.parse(localStorage.getItem(LS_OVERRIDE) || '{}');
  if (all[wk]) {
    delete all[wk][key];
    localStorage.setItem(LS_OVERRIDE, JSON.stringify(all));
  }
}

// ─────────────────────────────────────────────
// CUSTOM / SAVED RECIPES (local storage)
// ─────────────────────────────────────────────
function getCustomMeals() {
  return JSON.parse(localStorage.getItem(LS_CUSTOM) || '{}');
}

function saveCustomMeal(meal) {
  const all = getCustomMeals();
  all[meal.id] = meal;
  localStorage.setItem(LS_CUSTOM, JSON.stringify(all));
  return meal.id;
}

function deleteCustomMeal(id) {
  const all = getCustomMeals();
  delete all[id];
  localStorage.setItem(LS_CUSTOM, JSON.stringify(all));
}

function getAllMeals() {
  return Object.assign({}, ALL_MEALS, getCustomMeals());
}

// ─────────────────────────────────────────────
// IMPORT / EXPORT CUSTOM RECIPES
// ─────────────────────────────────────────────
function exportCustomMeals() {
  const meals = Object.values(getCustomMeals());
  const blob = new Blob([JSON.stringify(meals, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `meal-planner-recipes-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importCustomMeals(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (e) {
      alert('That file is not valid JSON.');
      return;
    }
    if (!Array.isArray(parsed)) {
      alert('Expected a JSON array of recipes.');
      return;
    }

    const existing = getCustomMeals();
    let added = 0, dup = 0, invalid = 0;

    parsed.forEach(entry => {
      if (!entry || typeof entry !== 'object' || !entry.id || !entry.name || !Array.isArray(entry.ingredients)) {
        invalid++;
        return;
      }
      if (existing[entry.id]) {
        dup++;
        return;
      }
      saveCustomMeal(entry);
      existing[entry.id] = entry;
      added++;
    });

    alert(`Import complete: ${added} added, ${dup} duplicates skipped, ${invalid} invalid skipped.`);
    if (activeView === 'recipes') renderRecipes();
  };
  reader.readAsText(file);
}

// ─────────────────────────────────────────────
// RENDER: CALENDAR
// ─────────────────────────────────────────────
function renderCalendar() {
  const weekAnchor = weekAnchorFromOffset(currentWeekOffset);
  const rotWeek = rotationWeekFor(weekAnchor);
  const weekEnd = addDays(weekAnchor, 6);

  document.getElementById('week-label').textContent =
    `${fmtDate(weekAnchor)} – ${fmtDate(weekEnd)}`;
  document.getElementById('week-num-label').textContent =
    `Rotation week ${rotWeek + 1} of 13`;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  const wk = weekKey(weekAnchor);
  const skips = getSkips(wk);
  const overrides = getOverrides(wk);

  for (let pos = 0; pos < 7; pos++) {
    const d      = (pos + 2) % 7; // Wed-anchored display position → Mon-based weekday index
    const date   = addDays(weekAnchor, pos);
    const plan   = getDayPlan(weekAnchor, d);
    const bMeal  = getMeal(plan.b);
    const lMeal  = getMeal(plan.l);
    const dMeal  = getMeal(plan.d);
    const today  = isToday(date);

    const isOff   = DAY_IS_OFF[d];
    const isBatch = DAY_IS_BATCH[d];
    const card = document.createElement('div');
    card.className = 'day-card' + (today ? ' today' : '') + (isBatch ? ' batch-day' : (isOff ? ' day-off' : ''));

    const dayNote = isBatch ? ' · Batch Day 🍳' : (isOff ? ' · Day Off' : (today ? ' · Today' : ''));
    const hdr = document.createElement('div');
    hdr.className = 'day-header';
    hdr.innerHTML = `<span class="day-name">${DAY_FULL[d]}</span><span class="day-date">${fmtDate(date)}${dayNote}</span>`;
    card.appendChild(hdr);

    [[bMeal,'breakfast','b'],[lMeal,'lunch','l'],[dMeal,'dinner','d']].forEach(([meal,type,tc]) => {
      if (!meal) return;
      const skipKey  = `${d}-${tc}`;
      const skipped  = !!skips[skipKey];

      const row = document.createElement('div');
      row.className = 'meal-row';

      const btn = document.createElement('button');
      btn.className = 'meal-row-btn' + (skipped ? ' skipped' : '');
      btn.setAttribute('aria-label', `View recipe: ${meal.name}`);

      const tags = [];
      if (meal.batch) tags.push('<span class="tag-batch">BATCH</span>');
      if (meal.tags && meal.tags.includes('spicy')) tags.push('<span class="tag-spicy">🌶</span>');

      btn.innerHTML = `
        <span class="meal-type-tag ${type}">${type.slice(0,1).toUpperCase() + type.slice(1,3)}</span>
        <span class="meal-info">
          <span class="meal-name">${meal.emoji || ''} ${meal.name}</span>
          <span class="meal-meta">
            ${meal.cal ? `<span class="meal-cal">${meal.cal} cal</span>` : ''}
            <span>${tags.join('')}</span>
          </span>
        </span>`;

      btn.addEventListener('click', () => openRecipe(meal.id));

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'meal-include-cb';
      cb.checked = !skipped;
      cb.setAttribute('aria-label', `Include ${meal.name} in shopping list`);
      cb.addEventListener('change', e => {
        e.stopPropagation();
        skips[skipKey] = !cb.checked ? true : undefined;
        if (!cb.checked) skips[skipKey] = true; else delete skips[skipKey];
        setSkip(wk, skipKey, !cb.checked);
        btn.classList.toggle('skipped', !cb.checked);
        if (activeView === 'shopping') renderShopping();
      });

      const swapBtn = document.createElement('button');
      swapBtn.className = 'meal-swap-btn' + (overrides[skipKey] ? ' active' : '');
      swapBtn.innerHTML = '⇄';
      swapBtn.setAttribute('aria-label', `Swap ${type}`);
      swapBtn.addEventListener('click', e => {
        e.stopPropagation();
        openSwapModal(d, tc);
      });

      row.appendChild(btn);
      row.appendChild(cb);
      row.appendChild(swapBtn);
      card.appendChild(row);
    });

    grid.appendChild(card);
  }

  updateHeaderBudget();
}

function updateHeaderBudget() {
  const el = document.getElementById('header-budget');
  const weekly = (MONTHLY_BUDGET / 4.33).toFixed(0);
  el.textContent = `$${MONTHLY_BUDGET}/mo`;
}

// ─────────────────────────────────────────────
// RENDER: SHOPPING LIST
// ─────────────────────────────────────────────
function renderShopping() {
  const weekAnchor = weekAnchorFromOffset(currentWeekOffset);
  const rotWeek = rotationWeekFor(weekAnchor);
  const weekEnd = addDays(weekAnchor, 6);
  const wk = weekKey(weekAnchor);

  document.getElementById('shop-week-label').textContent =
    `Week of ${fmtDate(weekAnchor)}`;
  document.getElementById('shop-week-sub').textContent =
    `${fmtDate(weekAnchor)} – ${fmtDate(weekEnd)} · Rotation week ${rotWeek + 1}`;

  const items = buildShoppingList(weekAnchor);
  const checks = getChecks(wk);
  const est = estimateCost(items);
  document.getElementById('shop-total').textContent = `$${est.toFixed(0)}`;

  const grouped = {};
  CATEGORIES.forEach(c => { grouped[c.key] = []; });
  grouped['other'] = [];

  items.forEach(item => {
    const cat = item.category || 'other';
    if (grouped[cat]) grouped[cat].push(item);
    else grouped['other'].push(item);
  });

  const list = document.getElementById('shopping-list');
  list.innerHTML = '';

  CATEGORIES.forEach(cat => {
    const catItems = grouped[cat.key];
    if (!catItems || catItems.length === 0) return;

    const section = document.createElement('div');
    section.className = 'shop-category';

    const hdr = document.createElement('div');
    hdr.className = 'shop-cat-header';
    hdr.innerHTML = `
      <span class="shop-cat-icon">${cat.icon}</span>
      <span class="shop-cat-name">${cat.label}</span>
      <span class="shop-cat-count">${catItems.length} item${catItems.length > 1 ? 's':''}</span>`;
    section.appendChild(hdr);

    catItems.forEach(item => {
      const checked = !!checks[item.name.toLowerCase()];
      const row = document.createElement('div');
      row.className = 'shop-item' + (checked ? ' checked' : '');
      row.dataset.key = item.name.toLowerCase();

      const qtyStr = item.qty ? displayImperial(item.qty, item.unit) : '';

      row.innerHTML = `
        <div class="shop-check" role="checkbox" aria-checked="${checked}" tabindex="0"></div>
        <span class="shop-item-name">${item.name}</span>
        <span class="shop-item-qty">${qtyStr}</span>`;

      const checkEl = row.querySelector('.shop-check');
      const toggle = () => {
        const nowChecked = row.classList.toggle('checked');
        checkEl.setAttribute('aria-checked', nowChecked);
        setCheck(wk, item.name.toLowerCase(), nowChecked);
      };
      checkEl.addEventListener('click', toggle);
      checkEl.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }});

      section.appendChild(row);
    });

    list.appendChild(section);
  });

  if (list.children.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">🛒</span>No meals planned for this week.</div>';
  }
}

function formatQty(n) {
  if (!n || n === 0) return '';
  return n % 1 === 0 ? n : Number(n.toFixed(1));
}

function displayImperial(qty, unit) {
  if (!qty) return '';
  const u = (unit || '').toLowerCase().trim();

  if (u === 'oz') {
    if (qty >= 32) return `${(qty / 16).toFixed(1)} lbs`;
    if (qty >= 16) return `${Math.round(qty / 16 * 10) / 10} lbs`;
    return `${Math.round(qty * 4) / 4} oz`;
  }
  if (u === 'cups') {
    const fracs = [[0.25,'¼'],[0.33,'⅓'],[0.5,'½'],[0.67,'⅔'],[0.75,'¾']];
    if (qty < 1) {
      for (const [v, s] of fracs) if (Math.abs(qty - v) < 0.05) return `${s} cup`;
    }
    if (qty >= 4)  return `${Math.round(qty)} cups`;
    if (qty >= 2)  return `${Math.round(qty * 2) / 2} cups`;
    return `${Math.round(qty * 4) / 4} cups`;
  }

  const q = formatQty(qty);
  return unit ? `${q} ${unit}` : `${q}`;
}

// ─────────────────────────────────────────────
// RENDER: RECIPES VIEW
// ─────────────────────────────────────────────
function renderRecipes() {
  if (recipeMode === 'search') { renderRecipeSearch(); return; }

  const q = recipeQuery.toLowerCase();
  const allMeals = [...BREAKFASTS, ...LUNCHES, ...DINNERS, ...Object.values(getCustomMeals())]
    .filter(m => m.id !== 'leftover');

  const filtered = allMeals.filter(m => {
    if (q && !m.name.toLowerCase().includes(q) &&
        !(m.tags || []).some(t => t.includes(q))) return false;
    if (recipeFilter === 'all')       return true;
    if (recipeFilter === 'breakfast') return m.type === 'breakfast';
    if (recipeFilter === 'lunch')     return m.type === 'lunch';
    if (recipeFilter === 'dinner')    return m.type === 'dinner';
    if (recipeFilter === 'batch')     return m.batch || (m.tags||[]).includes('batch-friendly');
    if (recipeFilter === 'spicy')     return (m.tags||[]).includes('spicy');
    if (recipeFilter === 'simple')    return (m.tags||[]).includes('low-ingredient');
    if (recipeFilter === 'red-meat')  return (m.tags||[]).includes('red-meat');
    return true;
  });

  const list = document.getElementById('recipe-list');
  list.innerHTML = '';

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📖</span>No recipes found.</div>';
    return;
  }

  filtered.forEach(meal => {
    const card = document.createElement('button');
    card.className = 'recipe-card';
    card.setAttribute('aria-label', `View recipe: ${meal.name}`);

    const pills = [];
    if (meal.type) {
      const colours = {breakfast:'blue',lunch:'amber',dinner:''};
      pills.push(`<span class="recipe-pill ${colours[meal.type]||''}">${meal.type}</span>`);
    }
    if (meal.prepTime) pills.push(`<span class="recipe-pill">⏱ ${meal.prepTime} min</span>`);
    if (meal.cal)      pills.push(`<span class="recipe-pill">${meal.cal} cal</span>`);
    if (meal.protein)  pills.push(`<span class="recipe-pill">${meal.protein}g protein</span>`);
    if ((meal.tags||[]).includes('spicy'))  pills.push(`<span class="recipe-pill red">🌶 Spicy</span>`);
    if (meal.batch || (meal.tags||[]).includes('batch-friendly')) pills.push(`<span class="recipe-pill purple">Batch</span>`);
    if (meal.source === 'themealdb') pills.push(`<span class="recipe-pill blue">Saved</span>`);
    if (meal.source === 'manual') pills.push(`<span class="recipe-pill">Custom</span>`);

    card.innerHTML = `
      <span class="recipe-emoji">${meal.emoji || '🍽'}</span>
      <span class="recipe-card-info">
        <span class="recipe-card-name">${meal.name}</span>
        <span class="recipe-card-meta">${pills.join('')}</span>
      </span>`;

    card.addEventListener('click', () => openRecipe(meal.id));
    list.appendChild(card);
  });
}

// ─────────────────────────────────────────────
// RECIPE SEARCH (TheMealDB live lookup)
// ─────────────────────────────────────────────
function fetchMealDbSearch(query) {
  return fetch(MEALDB_SEARCH_URL + encodeURIComponent(query))
    .then(r => {
      if (!r.ok) throw new Error('bad response');
      return r.json();
    })
    .then(data => (data.meals || []).map(mapMealDbToAppMeal));
}

function renderRecipeSearch() {
  const list = document.getElementById('recipe-list');
  const searchWrap = document.getElementById('recipe-search-wrap');
  const optionsBar = document.getElementById('search-browse-options');

  if (searchBrowseMode === 'name') {
    searchWrap.hidden = false;
    optionsBar.hidden = true;
    optionsBar.innerHTML = '';
    renderRecipeNameSearch(list);
    return;
  }

  if (searchBrowseMode === 'ingredient') {
    searchWrap.hidden = false;
    optionsBar.hidden = false;
    renderIngredientOptions(optionsBar);
    if (!browseSelectedValue) {
      list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">🥕</span>Type an ingredient, then pick one below.</div>';
      return;
    }
    renderBrowseResults(list, 'i', browseSelectedValue);
    return;
  }

  // cuisine / category
  searchWrap.hidden = true;
  optionsBar.hidden = false;
  const kind = searchBrowseMode === 'cuisine' ? 'a' : 'c';
  renderFixedOptions(optionsBar, kind);
  if (!browseSelectedValue) {
    list.innerHTML = `<div class="empty-state"><span class="empty-state-icon">📖</span>Pick a ${searchBrowseMode} above.</div>`;
    return;
  }
  renderBrowseResults(list, kind, browseSelectedValue);
}

function renderRecipeNameSearch(list) {
  const q = recipeQuery.trim();

  if (!q) {
    list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">🔎</span>Type a recipe name to search online.</div>';
    return;
  }

  list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">⏳</span>Searching…</div>';

  fetchMealDbSearch(q).then(results => {
    if (searchBrowseMode !== 'name' || recipeQuery.trim() !== q) return; // stale response, a newer search is in flight
    results.forEach(m => { previewMeals[m.id] = m; });

    if (results.length === 0) {
      list.innerHTML = `<div class="empty-state"><span class="empty-state-icon">📖</span>No recipes found for "${q}".</div>`;
      return;
    }

    list.innerHTML = '';
    results.forEach(meal => {
      const card = document.createElement('button');
      card.className = 'recipe-card';
      card.setAttribute('aria-label', `Preview recipe: ${meal.name}`);

      const pills = [];
      if (meal.tags && meal.tags.length) pills.push(`<span class="recipe-pill">${meal.tags[0]}</span>`);

      card.innerHTML = `
        <span class="recipe-emoji">${meal.emoji || '🍽'}</span>
        <span class="recipe-card-info">
          <span class="recipe-card-name">${meal.name}</span>
          <span class="recipe-card-meta">${pills.join('')}</span>
        </span>`;

      card.addEventListener('click', () => openRecipe(meal.id));
      list.appendChild(card);
    });
  }).catch(() => {
    if (searchBrowseMode !== 'name' || recipeQuery.trim() !== q) return;
    list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📡</span>Search unavailable — check your connection.</div>';
  });
}

// ─────────────────────────────────────────────
// BROWSE MODES (cuisine / category / ingredient / random)
// ─────────────────────────────────────────────
function fetchMealDbJson(path) {
  return fetch(MEALDB_BASE + path).then(r => {
    if (!r.ok) throw new Error('bad response');
    return r.json();
  });
}

function fetchMealDbList(kind) {
  // kind: 'c' (category) | 'a' (area/cuisine) | 'i' (ingredient)
  if (browseOptionsCache[kind]) return Promise.resolve(browseOptionsCache[kind]);
  const field = kind === 'c' ? 'strCategory' : kind === 'a' ? 'strArea' : 'strIngredient';
  return fetchMealDbJson(`list.php?${kind}=list`).then(data => {
    const values = (data.meals || []).map(m => m[field]).filter(Boolean);
    browseOptionsCache[kind] = values;
    return values;
  });
}

function fetchMealDbFilter(kind, value) {
  // TheMealDB expects underscores in place of spaces for multi-word ingredient names
  const param = kind === 'i' ? value.trim().replace(/\s+/g, '_') : value;
  return fetchMealDbJson(`filter.php?${kind}=${encodeURIComponent(param)}`)
    .then(data => (data.meals || []).map(m => ({ id: 'custom_' + m.idMeal, rawId: m.idMeal, name: m.strMeal })));
}

function fetchMealDbById(rawId) {
  return fetchMealDbJson(`lookup.php?i=${encodeURIComponent(rawId)}`)
    .then(data => {
      const m = (data.meals || [])[0];
      return m ? mapMealDbToAppMeal(m) : null;
    });
}

function fetchMealDbRandom() {
  return fetchMealDbJson('random.php').then(data => {
    const m = (data.meals || [])[0];
    return m ? mapMealDbToAppMeal(m) : null;
  });
}

function renderFixedOptions(container, kind) {
  container.innerHTML = '<span class="browse-loading">Loading…</span>';
  fetchMealDbList(kind).then(values => {
    container.innerHTML = '';
    values.forEach(v => {
      const chip = document.createElement('button');
      chip.className = 'filter-btn' + (v === browseSelectedValue ? ' active' : '');
      chip.textContent = v;
      chip.addEventListener('click', () => {
        browseSelectedValue = v;
        renderRecipeSearch();
      });
      container.appendChild(chip);
    });
  }).catch(() => {
    container.innerHTML = '<span class="browse-loading">Unavailable offline.</span>';
  });
}

function renderIngredientOptions(container) {
  const q = recipeQuery.trim().toLowerCase();
  if (!q) { container.innerHTML = ''; return; }
  fetchMealDbList('i').then(values => {
    if (recipeQuery.trim().toLowerCase() !== q) return; // stale, newer keystroke in flight
    const matches = values.filter(v => v.toLowerCase().includes(q)).slice(0, 20);
    container.innerHTML = '';
    matches.forEach(v => {
      const chip = document.createElement('button');
      chip.className = 'filter-btn' + (v === browseSelectedValue ? ' active' : '');
      chip.textContent = v;
      chip.addEventListener('click', () => {
        browseSelectedValue = v;
        renderRecipeSearch();
      });
      container.appendChild(chip);
    });
  }).catch(() => {
    container.innerHTML = '<span class="browse-loading">Unavailable offline.</span>';
  });
}

function renderBrowseResults(list, kind, value) {
  list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">⏳</span>Loading…</div>';
  fetchMealDbFilter(kind, value).then(results => {
    if (browseSelectedValue !== value) return; // stale, a different value was picked meanwhile

    if (results.length === 0) {
      list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📖</span>No recipes found.</div>';
      return;
    }

    list.innerHTML = '';
    results.forEach(partial => {
      const card = document.createElement('button');
      card.className = 'recipe-card';
      card.setAttribute('aria-label', `Preview recipe: ${partial.name}`);
      card.innerHTML = `
        <span class="recipe-emoji">🍽</span>
        <span class="recipe-card-info">
          <span class="recipe-card-name">${partial.name}</span>
          <span class="recipe-card-meta"></span>
        </span>`;

      card.addEventListener('click', () => {
        card.querySelector('.recipe-card-meta').textContent = 'Loading…';
        fetchMealDbById(partial.rawId).then(full => {
          if (!full) return;
          previewMeals[full.id] = full;
          openRecipe(full.id);
        }).catch(() => {
          card.querySelector('.recipe-card-meta').textContent = 'Unavailable';
        });
      });

      list.appendChild(card);
    });
  }).catch(() => {
    list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📡</span>Search unavailable — check your connection.</div>';
  });
}

function handleRandomRecipe() {
  const list = document.getElementById('recipe-list');
  const prevHtml = list.innerHTML;
  list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">🎲</span>Finding something…</div>';

  fetchMealDbRandom().then(meal => {
    list.innerHTML = prevHtml;
    if (!meal) return;
    previewMeals[meal.id] = meal;
    openRecipe(meal.id);
  }).catch(() => {
    list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📡</span>Search unavailable — check your connection.</div>';
  });
}

// ─────────────────────────────────────────────
// THEMEALDB → APP MEAL MAPPING
// ─────────────────────────────────────────────
function mapMealDbToAppMeal(m) {
  return {
    id: 'custom_' + m.idMeal,
    type: undefined,
    emoji: '🍽',
    name: m.strMeal,
    tags: (m.strTags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
    prepTime: undefined,
    cal: undefined,
    protein: undefined,
    imported: true,
    source: 'themealdb',
    sourceId: m.idMeal,
    ingredients: parseMealDbIngredients(m),
    steps: parseMealDbSteps(m.strInstructions),
  };
}

function parseMealDbIngredients(m) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = (m['strIngredient' + i] || '').trim();
    if (!name) continue;
    const measure = (m['strMeasure' + i] || '').trim();
    const { qty, unit } = parseMeasure(measure);
    ingredients.push({ name, qty, unit, category: guessCategory(name) });
  }
  return ingredients;
}

function parseMeasure(measure) {
  if (!measure) return { qty: 0, unit: '' };

  // "1 1/2 cups" style mixed number
  let match = measure.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
  if (match) {
    const qty = Number(match[1]) + Number(match[2]) / Number(match[3]);
    return normalizeMealDbUnit(qty, match[4].trim());
  }
  // "1/2 cup" simple fraction
  match = measure.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (match) {
    const qty = Number(match[1]) / Number(match[2]);
    return normalizeMealDbUnit(qty, match[3].trim());
  }
  // "200g" / "2 cups" / "2.5 oz"
  match = measure.match(/^([\d.]+)\s*(.*)$/);
  if (match) {
    const qty = Number(match[1]);
    return normalizeMealDbUnit(qty, match[2].trim());
  }
  // Free text with no leading number, e.g. "a pinch", "to taste"
  return { qty: 0, unit: measure };
}

function normalizeMealDbUnit(qty, unitText) {
  const u = unitText.toLowerCase().replace(/s$/, ''); // drop trailing plural s

  if (u === 'g' || u === 'gram') return { qty: qty / 28.35, unit: 'oz' };
  if (u === 'kg' || u === 'kilogram') return { qty: (qty * 1000) / 28.35, unit: 'oz' };
  if (u === 'lb' || u === 'pound') return { qty: qty * 16, unit: 'oz' };
  if (u === 'oz' || u === 'ounce') return { qty, unit: 'oz' };
  if (u === 'ml' || u === 'millilitre' || u === 'milliliter') return { qty: qty / 29.57, unit: 'fl oz' };
  if (u === 'fl oz' || u === 'fluid ounce') return { qty, unit: 'fl oz' };
  if (u === 'cup') return { qty, unit: 'cups' };
  if (u === 'tbsp' || u === 'tablespoon') return { qty, unit: 'tbsp' };
  if (u === 'tsp' || u === 'teaspoon') return { qty, unit: 'tsp' };
  if (u === 'slice') return { qty, unit: 'slices' };
  if (u === '') return { qty, unit: 'count' };
  return { qty, unit: unitText }; // unrecognized unit, kept as-is (e.g. "pinch", "clove")
}

function guessCategory(name) {
  const n = name.toLowerCase();
  if (/chicken|beef|pork|turkey|salmon|fish|shrimp|prawn|bacon|sausage|lamb|tofu|egg/.test(n)) return 'protein';
  if (/milk|cheese|yog(h)?urt|butter|cream/.test(n)) return 'dairy';
  if (/onion|garlic|pepper|tomato|spinach|lettuce|carrot|potato|herb|lemon|lime|avocado|broccoli|ginger/.test(n)) return 'produce';
  if (/rice|pasta|bread|flour|oat|noodle|tortilla|couscous/.test(n)) return 'grains';
  if (/canned|tinned|chickpea|black bean|kidney bean/.test(n)) return 'canned';
  if (/salt|paprika|cumin|cinnamon|chili|chilli|spice|turmeric|masala|cardamom|clove/.test(n)) return 'spices';
  return 'pantry';
}

function parseMealDbSteps(instructions) {
  if (!instructions) return [];
  return instructions
    .split(/\r?\n/)
    .map(s => s.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);
}

// ─────────────────────────────────────────────
// RECIPE MODAL
// ─────────────────────────────────────────────
function openRecipe(id) {
  const meal = getMeal(id);
  if (!meal || id === 'leftover') return;

  openMealId = id;
  const body = document.getElementById('modal-body');

  const tagHtml = (meal.tags || []).map(t => {
    const colours = {spicy:'red',batch:'purple','batch-friendly':'purple',indian:'',thai:'',mediterranean:'',vegetarian:'',quick:'',fish:'blue'};
    return `<span class="recipe-pill ${colours[t]||''}">${t.replace('-',' ')}</span>`;
  }).join('');

  const ingHtml = (meal.ingredients || []).map(ing => {
    const qty = ing.qty ? displayImperial(ing.qty, ing.unit) : '';
    return `<li class="ingredient-item"><span class="ingr-name">${ing.name}</span><span class="ingr-qty">${qty}</span></li>`;
  }).join('');

  const stepsHtml = (meal.steps || []).map((s, i) =>
    `<li class="step-item"><span class="step-num">${i+1}</span><span>${s}</span></li>`
  ).join('');

  const proteinPct = Math.min(100, Math.round((meal.protein || 0) / 160 * 100));
  const calPct     = Math.min(100, Math.round((meal.cal || 0) / 2200 * 100));

  body.innerHTML = `
    <span class="modal-emoji">${meal.emoji || '🍽'}</span>
    <h2 class="modal-title">${meal.name}</h2>

    <div class="modal-stats">
      <div class="stat-box"><span class="stat-val">${meal.cal || '–'}</span><span class="stat-lbl">Calories</span></div>
      <div class="stat-box"><span class="stat-val">${meal.protein || '–'}g</span><span class="stat-lbl">Protein</span></div>
      <div class="stat-box"><span class="stat-val">${meal.prepTime || '–'} min</span><span class="stat-lbl">Prep</span></div>
      <div class="stat-box"><span class="stat-val">$${(meal.cost || 0).toFixed(2)}</span><span class="stat-lbl">Est. cost</span></div>
    </div>

    <div class="modal-tags">${tagHtml}</div>

    ${meal.batchNote ? `<div class="batch-note">📦 ${meal.batchNote}</div>` : ''}

    <div class="nutrition-bar">
      <div class="nutrition-row"><span class="nutrition-label">Calories vs daily target (2,200)</span><span class="nutrition-val">${meal.cal || 0} kcal</span></div>
      <div class="bar-wrap"><div class="bar-fill" style="width:${calPct}%"></div></div>
      <div class="nutrition-row"><span class="nutrition-label">Protein vs daily target (150g)</span><span class="nutrition-val">${meal.protein || 0}g</span></div>
      <div class="bar-wrap"><div class="bar-fill" style="width:${proteinPct}%;background:#4895ef"></div></div>
    </div>

    ${ingHtml ? `
    <div class="modal-section">
      <div class="modal-section-title">Ingredients</div>
      <ul class="ingredient-list">${ingHtml}</ul>
    </div>` : ''}

    ${stepsHtml ? `
    <div class="modal-section">
      <div class="modal-section-title">Method</div>
      <ol class="steps-list">${stepsHtml}</ol>
    </div>` : ''}
  `;

  if (meal.source === 'themealdb' && !getCustomMeals()[meal.id]) {
    body.innerHTML += `
      <div class="modal-section save-recipe-section">
        <div class="modal-section-title">Save this recipe</div>
        <p class="swap-sub">Which meal slot does it belong to?</p>
        <div class="save-slot-row">
          <button class="filter-btn" data-slot="breakfast">Breakfast</button>
          <button class="filter-btn" data-slot="lunch">Lunch</button>
          <button class="filter-btn" data-slot="dinner">Dinner</button>
        </div>
      </div>`;

    body.querySelectorAll('.save-slot-row .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        meal.type = btn.dataset.slot;
        saveCustomMeal(meal);
        body.querySelector('.save-recipe-section').innerHTML =
          '<div class="modal-section-title">Saved to My Recipes!</div>';
      });
    });
  }

  const modal = document.getElementById('recipe-modal');
  modal.removeAttribute('hidden');
  modal.querySelector('.modal-sheet').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function closeRecipe() {
  document.getElementById('recipe-modal').setAttribute('hidden', '');
  document.body.style.overflow = '';
  openMealId = null;
}

// ─────────────────────────────────────────────
// SWAP MODAL
// ─────────────────────────────────────────────
const SLOT_TYPE_NAME = { b: 'breakfast', l: 'lunch', d: 'dinner' };

function openSwapModal(dayIndex, slotType) {
  const weekAnchor = weekAnchorFromOffset(currentWeekOffset);
  swapContext = { dayIndex, slotType, wk: weekKey(weekAnchor) };

  renderSwapModal('');

  const modal = document.getElementById('swap-modal');
  modal.removeAttribute('hidden');
  modal.querySelector('.modal-sheet').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function closeSwapModal() {
  document.getElementById('swap-modal').setAttribute('hidden', '');
  document.body.style.overflow = '';
  swapContext = null;
}

function renderSwapModal(filterText) {
  if (!swapContext) return;
  const { dayIndex, slotType, wk } = swapContext;
  const typeName = SLOT_TYPE_NAME[slotType];
  const plan = getDayPlan(weekAnchorFromOffset(currentWeekOffset), dayIndex);
  const currentMeal = getMeal(plan[slotType]);
  const hasOverride = !!getOverrides(wk)[`${dayIndex}-${slotType}`];

  const body = document.getElementById('swap-modal-body');
  body.innerHTML = `
    <h2 class="modal-title">Swap ${typeName[0].toUpperCase() + typeName.slice(1)}</h2>
    <p class="swap-sub">${DAY_FULL[dayIndex]} · currently ${currentMeal ? currentMeal.name : '–'}</p>
    <div class="recipe-search-wrap">
      <input type="search" id="swap-search" class="recipe-search" placeholder="Search meals…" autocomplete="off" value="${(filterText || '').replace(/"/g, '&quot;')}">
    </div>
    ${hasOverride ? '<button class="btn-outline" id="swap-reset">Reset to rotation default</button>' : ''}
    <div id="swap-candidates" class="recipe-list"></div>
  `;

  document.getElementById('swap-search').addEventListener('input', e => {
    renderSwapCandidates(e.target.value);
  });

  if (hasOverride) {
    document.getElementById('swap-reset').addEventListener('click', () => {
      clearOverride(wk, `${dayIndex}-${slotType}`);
      closeSwapModal();
      renderCalendar();
      if (activeView === 'shopping') renderShopping();
    });
  }

  renderSwapCandidates(filterText || '');
}

function renderSwapCandidates(filterText) {
  if (!swapContext) return;
  const { dayIndex, slotType, wk } = swapContext;
  const plan = getDayPlan(weekAnchorFromOffset(currentWeekOffset), dayIndex);
  const currentId = plan[slotType];
  const q = (filterText || '').toLowerCase().trim();

  const candidates = Object.values(getAllMeals()).filter(m =>
    m.type === slotType && m.id !== 'leftover' &&
    (!q || m.name.toLowerCase().includes(q))
  );

  const list = document.getElementById('swap-candidates');
  list.innerHTML = '';

  if (candidates.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📖</span>No matching meals.</div>';
    return;
  }

  candidates.forEach(meal => {
    const card = document.createElement('button');
    card.className = 'recipe-card';
    card.setAttribute('aria-label', `Swap in: ${meal.name}`);

    const pills = [];
    if (meal.id === currentId) pills.push('<span class="recipe-pill current">Current</span>');
    if (meal.prepTime) pills.push(`<span class="recipe-pill">⏱ ${meal.prepTime} min</span>`);
    if (meal.cal)      pills.push(`<span class="recipe-pill">${meal.cal} cal</span>`);

    card.innerHTML = `
      <span class="recipe-emoji">${meal.emoji || '🍽'}</span>
      <span class="recipe-card-info">
        <span class="recipe-card-name">${meal.name}</span>
        <span class="recipe-card-meta">${pills.join('')}</span>
      </span>`;

    card.addEventListener('click', () => {
      const key = `${dayIndex}-${slotType}`;
      setOverride(wk, key, meal.id);
      setSkip(wk, key, false); // swapping a meal in always includes it in the shopping list
      closeSwapModal();
      renderCalendar();
      if (activeView === 'shopping') renderShopping();
    });

    list.appendChild(card);
  });
}

// ─────────────────────────────────────────────
// ADD RECIPE (manual entry)
// ─────────────────────────────────────────────
function addIngredientRow(container) {
  const row = document.createElement('div');
  row.className = 'ar-ing-row';
  row.innerHTML = `
    <input type="text" class="ar-input ar-ing-name" placeholder="Ingredient">
    <input type="number" class="ar-input ar-ing-qty" placeholder="Qty" step="0.01">
    <select class="ar-ing-unit">
      <option value="">count</option>
      <option value="oz">oz</option>
      <option value="cups">cups</option>
      <option value="tbsp">tbsp</option>
      <option value="tsp">tsp</option>
      <option value="fl oz">fl oz</option>
      <option value="slices">slices</option>
    </select>
    <select class="ar-ing-cat">
      <option value="protein">Protein</option>
      <option value="produce">Produce</option>
      <option value="dairy">Dairy</option>
      <option value="grains">Grains</option>
      <option value="canned">Canned</option>
      <option value="pantry">Pantry</option>
      <option value="spices">Spices</option>
    </select>
    <button type="button" class="ar-ing-remove" aria-label="Remove ingredient">✕</button>
  `;
  row.querySelector('.ar-ing-remove').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function addStepRow(container) {
  const row = document.createElement('div');
  row.className = 'ar-step-row';
  row.innerHTML = `
    <input type="text" class="ar-input ar-step-text" placeholder="Step description">
    <button type="button" class="ar-step-remove" aria-label="Remove step">✕</button>
  `;
  row.querySelector('.ar-step-remove').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function openAddRecipeModal() {
  addRecipeType = 'breakfast';
  const body = document.getElementById('add-recipe-modal-body');
  body.innerHTML = `
    <h2 class="modal-title">Add a Recipe</h2>

    <div class="modal-section">
      <label class="ar-label">Name</label>
      <input type="text" id="ar-name" class="ar-input" placeholder="Recipe name">
    </div>

    <div class="modal-section">
      <label class="ar-label">Meal slot</label>
      <div class="save-slot-row" id="ar-type-row">
        <button type="button" class="filter-btn active" data-type="breakfast">Breakfast</button>
        <button type="button" class="filter-btn" data-type="lunch">Lunch</button>
        <button type="button" class="filter-btn" data-type="dinner">Dinner</button>
      </div>
    </div>

    <div class="modal-section ar-meta-row">
      <input type="text" id="ar-emoji" class="ar-emoji-input" placeholder="🍽" maxlength="2">
      <input type="number" id="ar-preptime" class="ar-num-input" placeholder="Prep (min)">
      <input type="number" id="ar-cal" class="ar-num-input" placeholder="Calories">
      <input type="number" id="ar-protein" class="ar-num-input" placeholder="Protein (g)">
    </div>

    <div class="modal-section">
      <label class="ar-check-row"><input type="checkbox" id="ar-batch"> Batch recipe (already makes 4 servings)</label>
      <input type="text" id="ar-batchnote" class="ar-input" placeholder='Batch note, e.g. "Makes 4 servings, keeps 4 days"' hidden>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Ingredients</div>
      <div id="ar-ingredients"></div>
      <button type="button" class="btn-outline" id="ar-add-ingredient">+ Add ingredient</button>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Steps</div>
      <div id="ar-steps"></div>
      <button type="button" class="btn-outline" id="ar-add-step">+ Add step</button>
    </div>

    <button type="button" class="btn-outline ar-save-btn" id="ar-save">Save Recipe</button>
  `;

  const ingContainer = document.getElementById('ar-ingredients');
  const stepContainer = document.getElementById('ar-steps');
  addIngredientRow(ingContainer);
  addStepRow(stepContainer);

  document.getElementById('ar-add-ingredient').addEventListener('click', () => addIngredientRow(ingContainer));
  document.getElementById('ar-add-step').addEventListener('click', () => addStepRow(stepContainer));

  document.querySelectorAll('#ar-type-row .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ar-type-row .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      addRecipeType = btn.dataset.type;
    });
  });

  document.getElementById('ar-batch').addEventListener('change', e => {
    document.getElementById('ar-batchnote').hidden = !e.target.checked;
  });

  document.getElementById('ar-save').addEventListener('click', saveManualRecipe);

  const modal = document.getElementById('add-recipe-modal');
  modal.removeAttribute('hidden');
  modal.querySelector('.modal-sheet').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function closeAddRecipeModal() {
  document.getElementById('add-recipe-modal').setAttribute('hidden', '');
  document.body.style.overflow = '';
}

function saveManualRecipe() {
  const name = document.getElementById('ar-name').value.trim();
  if (!name) { alert('Please enter a recipe name.'); return; }

  const ingredients = [];
  document.querySelectorAll('#ar-ingredients .ar-ing-row').forEach(row => {
    const ingName = row.querySelector('.ar-ing-name').value.trim();
    if (!ingName) return;
    ingredients.push({
      name: ingName,
      qty: parseFloat(row.querySelector('.ar-ing-qty').value) || 0,
      unit: row.querySelector('.ar-ing-unit').value,
      category: row.querySelector('.ar-ing-cat').value,
    });
  });
  if (ingredients.length === 0) { alert('Add at least one ingredient.'); return; }

  const steps = [];
  document.querySelectorAll('#ar-steps .ar-step-text').forEach(input => {
    const text = input.value.trim();
    if (text) steps.push(text);
  });

  const meal = {
    id: 'custom_manual_' + Date.now(),
    type: addRecipeType,
    emoji: document.getElementById('ar-emoji').value.trim() || '🍽',
    name,
    tags: [],
    prepTime: parseInt(document.getElementById('ar-preptime').value, 10) || undefined,
    cal: parseInt(document.getElementById('ar-cal').value, 10) || undefined,
    protein: parseInt(document.getElementById('ar-protein').value, 10) || undefined,
    ingredients,
    steps,
    source: 'manual',
  };

  if (document.getElementById('ar-batch').checked) {
    meal.batch = true;
    const note = document.getElementById('ar-batchnote').value.trim();
    if (note) meal.batchNote = note;
  }

  saveCustomMeal(meal);
  closeAddRecipeModal();
  if (activeView === 'recipes') renderRecipes();
  alert('Recipe saved to My Recipes!');
}

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
function switchView(name) {
  activeView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  document.querySelector(`.nav-btn[data-view="${name}"]`).classList.add('active');

  if (name === 'calendar')  renderCalendar();
  if (name === 'shopping')  renderShopping();
  if (name === 'recipes')   renderRecipes();
}

// ─────────────────────────────────────────────
// COPY SHOPPING LIST
// ─────────────────────────────────────────────
function copyShoppingList() {
  const weekAnchor = weekAnchorFromOffset(currentWeekOffset);
  const items  = buildShoppingList(weekAnchor);

  const grouped = {};
  CATEGORIES.forEach(c => { grouped[c.key] = []; });

  items.forEach(item => {
    const cat = item.category || 'other';
    if (grouped[cat]) grouped[cat].push(item);
  });

  let text = `🛒 Shopping List — ${fmtDate(weekAnchor)}\n\n`;

  CATEGORIES.forEach(cat => {
    const catItems = grouped[cat.key];
    if (!catItems || catItems.length === 0) return;
    text += `${cat.icon} ${cat.label}\n`;
    catItems.forEach(item => {
      const qty = item.qty ? ` (${displayImperial(item.qty, item.unit)})` : '';
      text += `  • ${item.name}${qty}\n`;
    });
    text += '\n';
  });

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-list');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }).catch(() => {
    alert('Copy failed — try selecting the list manually.');
  });
}

// ─────────────────────────────────────────────
// EVENT WIRING
// ─────────────────────────────────────────────
function initEvents() {
  // Bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Week nav (calendar)
  document.getElementById('prev-week').addEventListener('click', () => {
    currentWeekOffset--;
    renderCalendar();
    if (activeView === 'shopping') renderShopping();
  });
  document.getElementById('next-week').addEventListener('click', () => {
    currentWeekOffset++;
    renderCalendar();
    if (activeView === 'shopping') renderShopping();
  });

  // Recipe modal close
  document.getElementById('modal-close').addEventListener('click', closeRecipe);
  document.getElementById('modal-backdrop').addEventListener('click', closeRecipe);

  // Swap modal close
  document.getElementById('swap-modal-close').addEventListener('click', closeSwapModal);
  document.getElementById('swap-modal-backdrop').addEventListener('click', closeSwapModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeRecipe(); closeSwapModal(); closeAddRecipeModal(); }
  });

  // Recipe search + filters
  document.getElementById('recipe-search').addEventListener('input', e => {
    recipeQuery = e.target.value;
    if (recipeMode === 'mine') {
      renderRecipes();
    } else {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(renderRecipeSearch, 350);
    }
  });
  document.querySelectorAll('#recipe-tag-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#recipe-tag-filters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      recipeFilter = btn.dataset.filter;
      renderRecipes();
    });
  });

  // Recipe mode toggle (My Recipes / Search Online)
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      recipeMode = btn.dataset.mode;
      const inSearch = recipeMode === 'search';
      document.getElementById('recipe-tag-filters').style.display = inSearch ? 'none' : '';
      document.getElementById('recipe-io-actions').style.display = inSearch ? 'none' : '';
      document.getElementById('search-browse-bar').hidden = !inSearch;
      if (inSearch) {
        searchBrowseMode = 'name';
        browseSelectedValue = null;
        recipeQuery = '';
        document.getElementById('recipe-search').value = '';
        document.querySelectorAll('#search-browse-bar .filter-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.browse === 'name'));
      }
      renderRecipes();
    });
  });

  // Search-mode browse bar (name / cuisine / category / ingredient / random)
  document.querySelectorAll('#search-browse-bar .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.browse;
      if (mode === 'random') {
        handleRandomRecipe();
        return; // one-shot action, doesn't change the active browse mode
      }
      document.querySelectorAll('#search-browse-bar .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      searchBrowseMode = mode;
      browseSelectedValue = null;
      recipeQuery = '';
      document.getElementById('recipe-search').value = '';
      renderRecipeSearch();
    });
  });

  // Recipe import / export
  document.getElementById('export-recipes').addEventListener('click', exportCustomMeals);
  document.getElementById('import-recipes').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });
  document.getElementById('import-file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importCustomMeals(file);
    e.target.value = '';
  });

  // Add Recipe (manual entry)
  document.getElementById('add-recipe-btn').addEventListener('click', openAddRecipeModal);
  document.getElementById('add-recipe-modal-close').addEventListener('click', closeAddRecipeModal);
  document.getElementById('add-recipe-modal-backdrop').addEventListener('click', closeAddRecipeModal);

  // Shopping actions
  document.getElementById('clear-checks').addEventListener('click', () => {
    const weekAnchor = weekAnchorFromOffset(currentWeekOffset);
    clearChecks(weekKey(weekAnchor));
    renderShopping();
  });
  document.getElementById('copy-list').addEventListener('click', copyShoppingList);

  // Shopping list week sync with calendar week nav
  // (shopping view uses the same currentWeekOffset)
}

// ─────────────────────────────────────────────
// SERVICE WORKER
// ─────────────────────────────────────────────
function initSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// ─────────────────────────────────────────────
// INSTALL PROMPT (PWA)
// ─────────────────────────────────────────────
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
});

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSW();
  initEvents();
  switchView('calendar');
});
