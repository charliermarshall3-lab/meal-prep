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

// localStorage keys
const LS_CHECKS   = 'mp_checks';   // { 'YYYY-WW': { 'item name': true } }
const LS_OFFSET   = 'mp_offset';   // saved week offset

// ─────────────────────────────────────────────
// DATE UTILITIES
// ─────────────────────────────────────────────
function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function rotationWeekFor(monday) {
  const epochMonday = mondayOf(ROTATION_EPOCH);
  const diffMs = monday - epochMonday;
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  return ((diffWeeks % 13) + 13) % 13;
}

function currentMondayBase() {
  return mondayOf(new Date());
}

function weekMondayFromOffset(offset) {
  const base = currentMondayBase();
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

function weekKey(monday) {
  return `${monday.getFullYear()}-W${String(rotationWeekFor(monday)+1).padStart(2,'0')}-${monday.getDate()}`;
}

// ─────────────────────────────────────────────
// MEAL LOOKUP
// ─────────────────────────────────────────────
function getDayPlan(monday, dayIndex) {
  // dayIndex: 0=Mon … 6=Sun
  const rotWeek = rotationWeekFor(monday);
  return ROTATION[rotWeek][dayIndex];
}

function getMeal(id) {
  return ALL_MEALS[id] || null;
}

// ─────────────────────────────────────────────
// SHOPPING LIST LOGIC
// ─────────────────────────────────────────────
function unitNorm(unit) {
  return (unit || '').toLowerCase().trim();
}

function buildShoppingList(monday) {
  const aggregated = {};

  for (let d = 0; d < 7; d++) {
    const plan = getDayPlan(monday, d);
    const dinner = getMeal(plan.d);
    // Batch recipes already written for 4 servings; regular dinners scaled by day
    const dinnerMult = (dinner && dinner.batch) ? 1 : DINNER_SERVINGS[d];

    [[getMeal(plan.b), 1], [getMeal(plan.l), 1], [dinner, dinnerMult]]
      .forEach(([meal, mult]) => {
        if (!meal || !meal.ingredients) return;
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

function clearChecks(wk) {
  const all = JSON.parse(localStorage.getItem(LS_CHECKS) || '{}');
  delete all[wk];
  localStorage.setItem(LS_CHECKS, JSON.stringify(all));
}

// ─────────────────────────────────────────────
// RENDER: CALENDAR
// ─────────────────────────────────────────────
function renderCalendar() {
  const monday = weekMondayFromOffset(currentWeekOffset);
  const rotWeek = rotationWeekFor(monday);
  const weekEnd = addDays(monday, 6);

  document.getElementById('week-label').textContent =
    `${fmtDate(monday)} – ${fmtDate(weekEnd)}`;
  document.getElementById('week-num-label').textContent =
    `Rotation week ${rotWeek + 1} of 13`;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  for (let d = 0; d < 7; d++) {
    const date   = addDays(monday, d);
    const plan   = getDayPlan(monday, d);
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

    [[bMeal,'breakfast'],[lMeal,'lunch'],[dMeal,'dinner']].forEach(([meal,type]) => {
      if (!meal) return;
      const btn = document.createElement('button');
      btn.className = 'meal-row-btn';
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
      card.appendChild(btn);
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
  const monday = weekMondayFromOffset(currentWeekOffset);
  const rotWeek = rotationWeekFor(monday);
  const weekEnd = addDays(monday, 6);
  const wk = weekKey(monday);

  document.getElementById('shop-week-label').textContent =
    `Week of ${fmtDate(monday)}`;
  document.getElementById('shop-week-sub').textContent =
    `${fmtDate(monday)} – ${fmtDate(weekEnd)} · Rotation week ${rotWeek + 1}`;

  const items = buildShoppingList(monday);
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
  const q = recipeQuery.toLowerCase();
  const allMeals = [...BREAKFASTS, ...LUNCHES, ...DINNERS]
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
  const monday = weekMondayFromOffset(currentWeekOffset);
  const items  = buildShoppingList(monday);

  const grouped = {};
  CATEGORIES.forEach(c => { grouped[c.key] = []; });

  items.forEach(item => {
    const cat = item.category || 'other';
    if (grouped[cat]) grouped[cat].push(item);
  });

  let text = `🛒 Shopping List — ${fmtDate(monday)}\n\n`;

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
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeRecipe();
  });

  // Recipe search + filters
  document.getElementById('recipe-search').addEventListener('input', e => {
    recipeQuery = e.target.value;
    renderRecipes();
  });
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      recipeFilter = btn.dataset.filter;
      renderRecipes();
    });
  });

  // Shopping actions
  document.getElementById('clear-checks').addEventListener('click', () => {
    const monday = weekMondayFromOffset(currentWeekOffset);
    clearChecks(weekKey(monday));
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
