'use strict';

// All quantities are per 1 serving in American units (oz, cups, tsp, tbsp, fl oz, or count).
// Batch dinners are written for 4 servings total (the full batch).
// DINNER_SERVINGS in app.js controls how many portions each night's dinner produces.
// Weekend = Tue + Wed. Batch cook day = Wednesday.

// ─────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────
const CATEGORIES = [
  { key:'protein',  label:'Protein',       icon:'🥩' },
  { key:'produce',  label:'Produce',        icon:'🥦' },
  { key:'dairy',    label:'Dairy & Eggs',   icon:'🥛' },
  { key:'grains',   label:'Grains & Bread', icon:'🌾' },
  { key:'canned',   label:'Canned Goods',   icon:'🥫' },
  { key:'pantry',   label:'Pantry',         icon:'🫙' },
  { key:'spices',   label:'Spices',         icon:'🌶' },
];

// ─────────────────────────────────────────────
// BREAKFASTS  (1 serving each)
// ─────────────────────────────────────────────
const BREAKFASTS = [
  {
    id:'b1', type:'breakfast', emoji:'🥣',
    name:'Overnight Oats',
    tags:['no-cook','quick'],
    prepTime:5, cal:430, protein:18,
    ingredients:[
      { name:'rolled oats',    qty:0.75, unit:'cups',  category:'grains'  },
      { name:'milk',           qty:0.75, unit:'cups',  category:'dairy'   },
      { name:'banana',         qty:1,    unit:'',      category:'produce' },
      { name:'peanut butter',  qty:1,    unit:'tbsp',  category:'pantry'  },
      { name:'honey',          qty:1,    unit:'tbsp',  category:'pantry'  },
    ],
    steps:[
      'Combine oats, milk and peanut butter in a jar or container.',
      'Stir well, seal and refrigerate overnight.',
      'Slice banana on top before eating. Drizzle with honey.',
    ],
  },
  {
    id:'b2', type:'breakfast', emoji:'🍳',
    name:'Scrambled Eggs on Toast',
    tags:['quick','high-protein'],
    prepTime:10, cal:380, protein:26,
    ingredients:[
      { name:'eggs',           qty:2,    unit:'',      category:'dairy'   },
      { name:'bread',          qty:2,    unit:'slices', category:'grains' },
      { name:'butter',         qty:1,    unit:'tbsp',  category:'dairy'   },
      { name:'chili flakes',   qty:0.25, unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Toast bread. Melt butter in a pan over medium-low.',
      'Whisk eggs with a pinch of salt. Pour in and stir slowly until just set.',
      'Serve on toast, finish with chili flakes.',
    ],
  },
  {
    id:'b3', type:'breakfast', emoji:'🥛',
    name:'Greek Yogurt & Banana Bowl',
    tags:['no-cook','high-protein'],
    prepTime:3, cal:380, protein:22,
    ingredients:[
      { name:'Greek yogurt',   qty:8,    unit:'oz',    category:'dairy'   },
      { name:'banana',         qty:1,    unit:'',      category:'produce' },
      { name:'granola',        qty:0.33, unit:'cups',  category:'grains'  },
      { name:'honey',          qty:1,    unit:'tbsp',  category:'pantry'  },
    ],
    steps:[
      'Spoon yogurt into a bowl. Slice banana on top.',
      'Add granola and drizzle honey.',
    ],
  },
  {
    id:'b4', type:'breakfast', emoji:'🌯',
    name:'Spicy Egg & Cheese Burrito',
    tags:['high-protein','spicy'],
    prepTime:10, cal:480, protein:28,
    ingredients:[
      { name:'eggs',           qty:2,    unit:'',      category:'dairy'   },
      { name:'flour tortillas',qty:1,    unit:'',      category:'grains'  },
      { name:'shredded cheddar',qty:1,   unit:'oz',    category:'dairy'   },
      { name:'salsa',          qty:2,    unit:'tbsp',  category:'pantry'  },
    ],
    steps:[
      'Warm tortilla in a dry pan; set aside.',
      'Scramble whisked eggs until just set. Season with salt.',
      'Fill tortilla with eggs, cheese and salsa. Roll and eat.',
    ],
  },
  {
    id:'b5', type:'breakfast', emoji:'🍞',
    name:'Peanut Butter Banana Toast',
    tags:['no-cook','quick'],
    prepTime:3, cal:370, protein:12,
    ingredients:[
      { name:'bread',          qty:2,    unit:'slices', category:'grains' },
      { name:'peanut butter',  qty:2,    unit:'tbsp',  category:'pantry'  },
      { name:'banana',         qty:1,    unit:'',      category:'produce' },
      { name:'honey',          qty:1,    unit:'tbsp',  category:'pantry'  },
    ],
    steps:[
      'Toast bread. Spread peanut butter on each slice.',
      'Slice banana on top. Drizzle honey.',
    ],
  },
  {
    id:'b6', type:'breakfast', emoji:'🥑',
    name:'Avocado & Egg Toast',
    tags:['high-protein'],
    prepTime:10, cal:420, protein:22,
    ingredients:[
      { name:'eggs',           qty:2,    unit:'',      category:'dairy'   },
      { name:'bread',          qty:2,    unit:'slices', category:'grains' },
      { name:'avocado',        qty:0.5,  unit:'',      category:'produce' },
      { name:'chili flakes',   qty:0.25, unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Toast bread. Poach or fry eggs.',
      'Mash avocado onto toast, top with eggs and chili flakes.',
    ],
  },
  {
    id:'b7', type:'breakfast', emoji:'🥜',
    name:'Oats with Banana & Honey',
    tags:['quick','no-cook'],
    prepTime:5, cal:350, protein:12,
    ingredients:[
      { name:'rolled oats',    qty:0.75, unit:'cups',  category:'grains'  },
      { name:'milk',           qty:0.75, unit:'cups',  category:'dairy'   },
      { name:'banana',         qty:1,    unit:'',      category:'produce' },
      { name:'honey',          qty:1,    unit:'tbsp',  category:'pantry'  },
      { name:'cinnamon',       qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Microwave oats and milk 2-3 min, stirring halfway.',
      'Slice banana on top. Drizzle honey and add cinnamon.',
    ],
  },
  {
    id:'b8', type:'breakfast', emoji:'🍓',
    name:'Yogurt & Berry Bowl',
    tags:['no-cook','high-protein'],
    prepTime:3, cal:360, protein:22,
    ingredients:[
      { name:'Greek yogurt',   qty:8,    unit:'oz',    category:'dairy'   },
      { name:'frozen berries', qty:0.5,  unit:'cups',  category:'produce' },
      { name:'granola',        qty:0.33, unit:'cups',  category:'grains'  },
      { name:'honey',          qty:1,    unit:'tbsp',  category:'pantry'  },
    ],
    steps:[
      'Spoon yogurt into bowl. Top with berries and granola.',
      'Drizzle honey. Let sit 2 min so berries thaw slightly.',
    ],
  },
];

// ─────────────────────────────────────────────
// LUNCHES  (1 serving each)
// Home lunches (l1–l3) use ingredients already in the house.
// Packed lunches (l4–l6) use shared weekly ingredients.
// 'leftover' = pack previous night's dinner.
// ─────────────────────────────────────────────
const LUNCHES = [
  {
    id:'leftover', type:'lunch', emoji:'📦',
    name:'Packed Leftovers',
    tags:['quick','no-cook'],
    prepTime:0, cal:0, protein:0,
    ingredients:[],
    steps:['Pack last night\'s dinner into a container. Refrigerate until ready to take.'],
  },
  {
    id:'l1', type:'lunch', emoji:'🍚',
    name:'Quick Rice & Spinach Bowl',
    tags:['quick','no-cook'],
    prepTime:5, cal:280, protein:8,
    ingredients:[
      { name:'spinach',        qty:1,    unit:'oz',    category:'produce' },
      { name:'soy sauce',      qty:1,    unit:'tbsp',  category:'pantry'  },
      { name:'sesame oil',     qty:1,    unit:'tsp',   category:'pantry'  },
    ],
    steps:['Reheat leftover rice. Wilt spinach in pan 1 min. Toss together with soy sauce and sesame oil.'],
  },
  {
    id:'l2', type:'lunch', emoji:'🍳',
    name:'Eggs on Toast',
    tags:['quick','high-protein'],
    prepTime:10, cal:380, protein:26,
    ingredients:[
      { name:'eggs',           qty:2,    unit:'',      category:'dairy'   },
      { name:'bread',          qty:2,    unit:'slices', category:'grains' },
      { name:'butter',         qty:1,    unit:'tbsp',  category:'dairy'   },
    ],
    steps:['Toast bread. Fry or scramble eggs in butter. Serve on toast.'],
  },
  {
    id:'l3', type:'lunch', emoji:'🥛',
    name:'Yogurt & Banana',
    tags:['no-cook','quick'],
    prepTime:2, cal:360, protein:22,
    ingredients:[
      { name:'Greek yogurt',   qty:8,    unit:'oz',    category:'dairy'   },
      { name:'banana',         qty:1,    unit:'',      category:'produce' },
      { name:'granola',        qty:0.33, unit:'cups',  category:'grains'  },
    ],
    steps:['Spoon yogurt into a container. Slice banana and add granola on top.'],
  },
  {
    id:'l4', type:'lunch', emoji:'🌯',
    name:'Hummus & Veggie Wrap',
    tags:['no-cook','quick'],
    prepTime:5, cal:360, protein:12,
    ingredients:[
      { name:'flour tortillas',qty:1,    unit:'',      category:'grains'  },
      { name:'hummus',         qty:3,    unit:'tbsp',  category:'pantry'  },
      { name:'spinach',        qty:1,    unit:'oz',    category:'produce' },
      { name:'bell pepper',    qty:0.5,  unit:'',      category:'produce' },
    ],
    steps:['Spread hummus on tortilla. Add spinach and sliced bell pepper. Roll up tightly.'],
  },
  {
    id:'l5', type:'lunch', emoji:'🫘',
    name:'Black Bean Wrap',
    tags:['quick','spicy'],
    prepTime:5, cal:400, protein:20,
    ingredients:[
      { name:'flour tortillas',qty:1,    unit:'',      category:'grains'  },
      { name:'canned black beans',qty:5, unit:'oz',    category:'canned'  },
      { name:'spinach',        qty:1,    unit:'oz',    category:'produce' },
      { name:'salsa',          qty:2,    unit:'tbsp',  category:'pantry'  },
      { name:'shredded cheddar',qty:1,   unit:'oz',    category:'dairy'   },
    ],
    steps:['Warm beans with a splash of water. Fill tortilla with beans, cheese, salsa and spinach. Roll.'],
  },
  {
    id:'l6', type:'lunch', emoji:'🫘',
    name:'Chickpea & Spinach Wrap',
    tags:['quick'],
    prepTime:5, cal:380, protein:16,
    ingredients:[
      { name:'flour tortillas',qty:1,    unit:'',      category:'grains'  },
      { name:'canned chickpeas',qty:5,   unit:'oz',    category:'canned'  },
      { name:'spinach',        qty:1,    unit:'oz',    category:'produce' },
      { name:'lemon',          qty:0.5,  unit:'',      category:'produce' },
      { name:'cumin',          qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:['Drain and rinse chickpeas. Toss with spinach, cumin and a squeeze of lemon. Wrap in tortilla.'],
  },
];

// ─────────────────────────────────────────────
// DINNERS – regular (1 serving each)
// ─────────────────────────────────────────────
const DINNERS = [
  {
    id:'d1', type:'dinner', emoji:'🌿',
    name:'Thai Basil Chicken',
    tags:['spicy','quick','thai'],
    prepTime:20, cal:420, protein:38,
    ingredients:[
      { name:'chicken thighs', qty:5,    unit:'oz',    category:'protein' },
      { name:'basmati rice',   qty:0.33, unit:'cups',  category:'grains'  },
      { name:'garlic cloves',  qty:2,    unit:'',      category:'produce' },
      { name:'soy sauce',      qty:1,    unit:'tbsp',  category:'pantry'  },
      { name:'fish sauce',     qty:1,    unit:'tsp',   category:'pantry'  },
      { name:'chili flakes',   qty:1,    unit:'tsp',   category:'spices'  },
      { name:'spinach',        qty:1,    unit:'oz',    category:'produce' },
    ],
    steps:[
      'Cook rice per packet. Slice chicken into bite-sized pieces.',
      'Heat oil in a pan on high. Cook chicken 4-5 min until golden.',
      'Add minced garlic and chili flakes, cook 1 min.',
      'Add soy sauce and fish sauce. Toss. Stir in spinach until wilted.',
      'Serve over rice.',
    ],
  },
  {
    id:'d2', type:'dinner', emoji:'🍱',
    name:'Teriyaki Chicken Bowl',
    tags:['quick','asian'],
    prepTime:20, cal:440, protein:38,
    ingredients:[
      { name:'chicken thighs', qty:5,    unit:'oz',    category:'protein' },
      { name:'basmati rice',   qty:0.33, unit:'cups',  category:'grains'  },
      { name:'garlic cloves',  qty:1,    unit:'',      category:'produce' },
      { name:'soy sauce',      qty:1,    unit:'tbsp',  category:'pantry'  },
      { name:'honey',          qty:1,    unit:'tbsp',  category:'pantry'  },
      { name:'fresh ginger',   qty:0.25, unit:'oz',    category:'produce' },
      { name:'spinach',        qty:1,    unit:'oz',    category:'produce' },
    ],
    steps:[
      'Cook rice. Mix soy sauce, honey and grated ginger.',
      'Pan-fry chicken thighs 5-6 min each side until cooked.',
      'Pour sauce over chicken, coat and cook 1-2 min until glazed.',
      'Serve over rice with wilted spinach.',
    ],
  },
  {
    id:'d3', type:'dinner', emoji:'🍋',
    name:'Lemon Garlic Chicken',
    tags:['quick','simple'],
    prepTime:20, cal:320, protein:35,
    ingredients:[
      { name:'chicken thighs', qty:5,    unit:'oz',    category:'protein' },
      { name:'garlic cloves',  qty:2,    unit:'',      category:'produce' },
      { name:'lemon',          qty:0.5,  unit:'',      category:'produce' },
      { name:'olive oil',      qty:1,    unit:'tbsp',  category:'pantry'  },
      { name:'spinach',        qty:1.5,  unit:'oz',    category:'produce' },
      { name:'smoked paprika', qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Season chicken with paprika, salt and pepper.',
      'Heat oil in pan. Cook chicken 5-6 min each side until golden.',
      'Add minced garlic and cook 1 min. Squeeze lemon over.',
      'Wilt spinach in same pan. Serve together.',
    ],
  },
  {
    id:'d4', type:'dinner', emoji:'🥢',
    name:'Spicy Chicken Stir-Fry',
    tags:['spicy','quick','asian'],
    prepTime:20, cal:430, protein:38,
    ingredients:[
      { name:'chicken thighs', qty:5,    unit:'oz',    category:'protein' },
      { name:'basmati rice',   qty:0.33, unit:'cups',  category:'grains'  },
      { name:'bell pepper',    qty:0.5,  unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:2,    unit:'',      category:'produce' },
      { name:'fresh ginger',   qty:0.25, unit:'oz',    category:'produce' },
      { name:'soy sauce',      qty:1.5,  unit:'tbsp',  category:'pantry'  },
      { name:'chili flakes',   qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Cook rice. Slice chicken and bell pepper into strips.',
      'Heat oil on high. Cook chicken 4-5 min. Remove.',
      'Stir-fry pepper with ginger and garlic 2 min.',
      'Return chicken. Add soy sauce and chili flakes. Toss and serve over rice.',
    ],
  },
  {
    id:'d5', type:'dinner', emoji:'🫘',
    name:'Chana Masala',
    tags:['spicy','vegetarian','indian','budget'],
    prepTime:20, cal:420, protein:18,
    ingredients:[
      { name:'canned chickpeas',qty:7.5, unit:'oz',    category:'canned'  },
      { name:'canned diced tomatoes',qty:7,unit:'oz',  category:'canned'  },
      { name:'onion',          qty:0.5,  unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:2,    unit:'',      category:'produce' },
      { name:'basmati rice',   qty:0.33, unit:'cups',  category:'grains'  },
      { name:'garam masala',   qty:1,    unit:'tsp',   category:'spices'  },
      { name:'chili powder',   qty:0.75, unit:'tsp',   category:'spices'  },
      { name:'cumin',          qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Cook rice. Dice onion; mince garlic.',
      'Heat oil. Cook onion 5 min. Add garlic and spices 1 min.',
      'Add tomatoes, simmer 5 min. Add chickpeas, simmer 8 min.',
      'Adjust seasoning. Serve over rice.',
    ],
  },
  {
    id:'d6', type:'dinner', emoji:'🍲',
    name:'Dal Tadka',
    tags:['spicy','vegetarian','indian','budget'],
    prepTime:25, cal:400, protein:20,
    ingredients:[
      { name:'red lentils',    qty:0.5,  unit:'cups',  category:'pantry'  },
      { name:'canned diced tomatoes',qty:7,unit:'oz',  category:'canned'  },
      { name:'onion',          qty:0.5,  unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:2,    unit:'',      category:'produce' },
      { name:'basmati rice',   qty:0.33, unit:'cups',  category:'grains'  },
      { name:'cumin',          qty:1,    unit:'tsp',   category:'spices'  },
      { name:'chili powder',   qty:0.75, unit:'tsp',   category:'spices'  },
      { name:'turmeric',       qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Rinse lentils. Simmer in 1.5 cups water with turmeric 15 min until soft.',
      'Fry onion 5 min. Add garlic and cumin 1 min. Add tomatoes, cook 5 min.',
      'Combine with lentils. Add chili powder. Simmer 5 min.',
      'Serve over rice.',
    ],
  },
  {
    id:'d7', type:'dinner', emoji:'🍳',
    name:'Egg Fried Rice',
    tags:['quick','budget','asian'],
    prepTime:15, cal:380, protein:18,
    ingredients:[
      { name:'eggs',           qty:2,    unit:'',      category:'dairy'   },
      { name:'basmati rice',   qty:0.33, unit:'cups',  category:'grains'  },
      { name:'garlic cloves',  qty:1,    unit:'',      category:'produce' },
      { name:'spinach',        qty:1,    unit:'oz',    category:'produce' },
      { name:'soy sauce',      qty:1.5,  unit:'tbsp',  category:'pantry'  },
      { name:'sesame oil',     qty:1,    unit:'tsp',   category:'pantry'  },
    ],
    steps:[
      'Cook rice and let cool slightly (or use day-old rice).',
      'Heat oil on high. Add garlic 30 sec. Add rice, fry 2 min.',
      'Push rice to side. Scramble eggs in the gap, then mix through.',
      'Add spinach, soy sauce and sesame oil. Toss until spinach wilts.',
    ],
  },
  {
    id:'d8', type:'dinner', emoji:'🍅',
    name:'Shakshuka',
    tags:['spicy','vegetarian','quick'],
    prepTime:20, cal:320, protein:20,
    ingredients:[
      { name:'eggs',           qty:2,    unit:'',      category:'dairy'   },
      { name:'canned diced tomatoes',qty:7,unit:'oz',  category:'canned'  },
      { name:'bell pepper',    qty:0.5,  unit:'',      category:'produce' },
      { name:'onion',          qty:0.5,  unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:2,    unit:'',      category:'produce' },
      { name:'cumin',          qty:1,    unit:'tsp',   category:'spices'  },
      { name:'chili powder',   qty:0.75, unit:'tsp',   category:'spices'  },
      { name:'smoked paprika', qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Fry diced onion and bell pepper in oil 5 min.',
      'Add garlic and spices, cook 1 min.',
      'Pour in tomatoes, simmer 8 min. Season.',
      'Make 2 wells. Crack in eggs. Cover and cook 5-7 min until whites set.',
      'Eat from the pan with bread.',
    ],
  },
  {
    id:'d9', type:'dinner', emoji:'🌮',
    name:'Spicy Beef Tacos',
    tags:['spicy','quick','red-meat'],
    prepTime:15, cal:480, protein:32,
    ingredients:[
      { name:'ground beef',    qty:4,    unit:'oz',    category:'protein' },
      { name:'corn tortillas', qty:2,    unit:'',      category:'grains'  },
      { name:'canned black beans',qty:3, unit:'oz',    category:'canned'  },
      { name:'salsa',          qty:2,    unit:'tbsp',  category:'pantry'  },
      { name:'shredded cheddar',qty:1,   unit:'oz',    category:'dairy'   },
      { name:'lime',           qty:0.5,  unit:'',      category:'produce' },
      { name:'chili powder',   qty:0.5,  unit:'tsp',   category:'spices'  },
      { name:'cumin',          qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Cook beef with chili powder, cumin, salt until browned, 5-6 min.',
      'Warm tortillas on a dry pan. Warm beans separately.',
      'Fill tortillas with beef, beans, cheese and salsa.',
      'Squeeze lime over before eating.',
    ],
  },
  {
    id:'d10', type:'dinner', emoji:'🍚',
    name:'Korean Beef Bowl',
    tags:['quick','asian','red-meat'],
    prepTime:20, cal:460, protein:32,
    ingredients:[
      { name:'ground beef',    qty:4,    unit:'oz',    category:'protein' },
      { name:'basmati rice',   qty:0.33, unit:'cups',  category:'grains'  },
      { name:'garlic cloves',  qty:2,    unit:'',      category:'produce' },
      { name:'fresh ginger',   qty:0.25, unit:'oz',    category:'produce' },
      { name:'soy sauce',      qty:1.5,  unit:'tbsp',  category:'pantry'  },
      { name:'brown sugar',    qty:1,    unit:'tbsp',  category:'pantry'  },
      { name:'sesame oil',     qty:1,    unit:'tsp',   category:'pantry'  },
      { name:'spinach',        qty:1,    unit:'oz',    category:'produce' },
      { name:'chili flakes',   qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Cook rice. Brown beef in a hot pan, breaking up, 5-6 min.',
      'Add garlic, ginger and chili flakes, cook 1 min.',
      'Mix in soy sauce, brown sugar and sesame oil. Toss.',
      'Wilt spinach in pan. Serve beef mixture over rice.',
    ],
  },
  {
    id:'d11', type:'dinner', emoji:'🧀',
    name:'Spicy Black Bean Quesadilla',
    tags:['quick','vegetarian','spicy'],
    prepTime:10, cal:420, protein:22,
    ingredients:[
      { name:'flour tortillas',qty:2,    unit:'',      category:'grains'  },
      { name:'canned black beans',qty:5.5,unit:'oz',   category:'canned'  },
      { name:'shredded cheddar',qty:1.5, unit:'oz',    category:'dairy'   },
      { name:'salsa',          qty:2,    unit:'tbsp',  category:'pantry'  },
      { name:'spinach',        qty:1,    unit:'oz',    category:'produce' },
      { name:'chili flakes',   qty:0.25, unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Drain and lightly mash beans. Mix with chili flakes.',
      'Spread beans on one tortilla. Top with cheese, salsa and spinach.',
      'Press second tortilla on top. Cook in dry pan 2-3 min per side until golden.',
      'Slice into wedges.',
    ],
  },
  {
    id:'d12', type:'dinner', emoji:'🥜',
    name:'Spicy Peanut Noodles',
    tags:['spicy','quick','vegetarian'],
    prepTime:15, cal:450, protein:18,
    ingredients:[
      { name:'pasta',          qty:2.5,  unit:'oz',    category:'grains'  },
      { name:'peanut butter',  qty:2,    unit:'tbsp',  category:'pantry'  },
      { name:'soy sauce',      qty:1.5,  unit:'tbsp',  category:'pantry'  },
      { name:'sriracha',       qty:1,    unit:'tsp',   category:'pantry'  },
      { name:'lime',           qty:0.5,  unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:1,    unit:'',      category:'produce' },
      { name:'spinach',        qty:1,    unit:'oz',    category:'produce' },
    ],
    steps:[
      'Cook pasta. Reserve 3 tbsp pasta water.',
      'Whisk peanut butter, soy sauce, sriracha, lime juice and garlic.',
      'Thin sauce with pasta water until pourable.',
      'Toss pasta with sauce and spinach until coated.',
    ],
  },
  {
    id:'d13', type:'dinner', emoji:'🫙',
    name:'Mediterranean Chicken Bowl',
    tags:['quick','mediterranean'],
    prepTime:20, cal:430, protein:36,
    ingredients:[
      { name:'chicken thighs', qty:5,    unit:'oz',    category:'protein' },
      { name:'couscous',       qty:0.33, unit:'cups',  category:'grains'  },
      { name:'garlic cloves',  qty:2,    unit:'',      category:'produce' },
      { name:'lemon',          qty:0.5,  unit:'',      category:'produce' },
      { name:'olive oil',      qty:1,    unit:'tbsp',  category:'pantry'  },
      { name:'spinach',        qty:1,    unit:'oz',    category:'produce' },
      { name:'cumin',          qty:0.5,  unit:'tsp',   category:'spices'  },
      { name:'smoked paprika', qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Cook couscous: pour 1/2 cup boiling water over, cover 5 min, fluff.',
      'Season chicken with cumin, paprika, salt. Cook in oiled pan 5-6 min each side.',
      'Add garlic last minute. Squeeze lemon over.',
      'Serve over couscous with spinach.',
    ],
  },
  {
    id:'d14', type:'dinner', emoji:'🍗',
    name:'One-Pan Garlic Rice & Chicken',
    tags:['quick','simple'],
    prepTime:25, cal:410, protein:36,
    ingredients:[
      { name:'chicken thighs', qty:5,    unit:'oz',    category:'protein' },
      { name:'basmati rice',   qty:0.33, unit:'cups',  category:'grains'  },
      { name:'garlic cloves',  qty:3,    unit:'',      category:'produce' },
      { name:'olive oil',      qty:1,    unit:'tbsp',  category:'pantry'  },
      { name:'smoked paprika', qty:0.75, unit:'tsp',   category:'spices'  },
      { name:'spinach',        qty:1,    unit:'oz',    category:'produce' },
    ],
    steps:[
      'Season chicken with paprika, salt and pepper.',
      'Brown chicken in oiled pan 3 min per side. Remove.',
      'Add garlic and rice, stir 1 min. Add 0.8 cups water and return chicken.',
      'Cover and simmer 15 min until rice is cooked through.',
      'Stir in spinach until wilted.',
    ],
  },
  {
    id:'d15', type:'dinner', emoji:'🫘',
    name:'Black Bean & Rice Bowl',
    tags:['quick','vegetarian','budget'],
    prepTime:10, cal:390, protein:16,
    ingredients:[
      { name:'canned black beans',qty:7.5,unit:'oz',   category:'canned'  },
      { name:'basmati rice',   qty:0.33, unit:'cups',  category:'grains'  },
      { name:'onion',          qty:0.5,  unit:'',      category:'produce' },
      { name:'salsa',          qty:2,    unit:'tbsp',  category:'pantry'  },
      { name:'shredded cheddar',qty:1,   unit:'oz',    category:'dairy'   },
      { name:'lime',           qty:0.5,  unit:'',      category:'produce' },
      { name:'cumin',          qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Cook rice. Dice onion and cook in oil with cumin 3 min.',
      'Add beans and warm through 4 min.',
      'Serve over rice. Top with salsa, cheese and a squeeze of lime.',
    ],
  },

  // ── BATCH DINNERS (4 servings — ingredients listed for the full batch) ──

  {
    id:'bd1', type:'dinner', emoji:'🍛', batch:true,
    name:'Butter Chicken',
    tags:['spicy','indian','batch'],
    prepTime:35, cal:560, protein:42,
    batchNote:'Makes 4 servings. Great over rice or with naan. Keeps 4 days in fridge.',
    ingredients:[
      { name:'chicken thighs', qty:20,   unit:'oz',    category:'protein' },
      { name:'canned diced tomatoes',qty:14,unit:'oz', category:'canned'  },
      { name:'heavy cream',    qty:3,    unit:'fl oz', category:'dairy'   },
      { name:'onion',          qty:1,    unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:4,    unit:'',      category:'produce' },
      { name:'fresh ginger',   qty:0.75, unit:'oz',    category:'produce' },
      { name:'tikka masala paste',qty:3, unit:'tbsp',  category:'pantry'  },
      { name:'butter',         qty:1,    unit:'tbsp',  category:'dairy'   },
      { name:'basmati rice',   qty:1.5,  unit:'cups',  category:'grains'  },
      { name:'garam masala',   qty:1,    unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Cube chicken. Melt butter in a large pan. Brown chicken in batches, 5 min. Remove.',
      'Cook diced onion 5 min. Add garlic, ginger and tikka paste. Cook 2 min.',
      'Add tomatoes, simmer 10 min. Blend smooth if you like a silky sauce.',
      'Return chicken. Stir in cream and garam masala. Simmer 8 min.',
      'Cook rice separately. Portion chicken into 4 containers with rice.',
    ],
  },
  {
    id:'bd2', type:'dinner', emoji:'🍜', batch:true,
    name:'Thai Green Curry',
    tags:['spicy','thai','batch'],
    prepTime:30, cal:540, protein:40,
    batchNote:'Makes 4 servings. Reheat gently. Keeps 4 days in fridge.',
    ingredients:[
      { name:'chicken thighs', qty:20,   unit:'oz',    category:'protein' },
      { name:'coconut milk',   qty:13.5, unit:'fl oz', category:'canned'  },
      { name:'green curry paste',qty:3,  unit:'tbsp',  category:'pantry'  },
      { name:'bell pepper',    qty:2,    unit:'',      category:'produce' },
      { name:'basmati rice',   qty:1.5,  unit:'cups',  category:'grains'  },
      { name:'fish sauce',     qty:2,    unit:'tsp',   category:'pantry'  },
      { name:'lime',           qty:1,    unit:'',      category:'produce' },
      { name:'spinach',        qty:2,    unit:'oz',    category:'produce' },
    ],
    steps:[
      'Cut chicken into chunks. Cook rice.',
      'In a large pan, fry curry paste in oil 1 min until fragrant.',
      'Add chicken, coat in paste, cook 3 min.',
      'Pour in coconut milk. Simmer 12 min.',
      'Add sliced bell pepper and fish sauce. Simmer 5 min.',
      'Finish with lime juice and spinach. Portion into 4 containers with rice.',
    ],
  },
  {
    id:'bd3', type:'dinner', emoji:'🌶', batch:true,
    name:'Beef Chili',
    tags:['spicy','red-meat','batch'],
    prepTime:40, cal:480, protein:34,
    batchNote:'Makes 4 servings. Serve with rice, tortilla chips or bread. Keeps 5 days.',
    ingredients:[
      { name:'ground beef',    qty:16,   unit:'oz',    category:'protein' },
      { name:'canned black beans',qty:30,unit:'oz',    category:'canned'  },
      { name:'canned diced tomatoes',qty:28,unit:'oz', category:'canned'  },
      { name:'canned corn',    qty:7.5,  unit:'oz',    category:'canned'  },
      { name:'onion',          qty:1,    unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:3,    unit:'',      category:'produce' },
      { name:'chili powder',   qty:2,    unit:'tbsp',  category:'spices'  },
      { name:'cumin',          qty:1,    unit:'tsp',   category:'spices'  },
      { name:'smoked paprika', qty:1,    unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Cook diced onion in oil 5 min. Add garlic 1 min.',
      'Add beef. Brown, breaking up, 6-7 min.',
      'Add all spices, cook 1 min.',
      'Add tomatoes, beans and corn. Simmer 20 min, stirring occasionally.',
      'Season and portion into 4 containers.',
    ],
  },
  {
    id:'bd4', type:'dinner', emoji:'🥙', batch:true,
    name:'Chicken Shawarma Bowls',
    tags:['spicy','mediterranean','batch'],
    prepTime:35, cal:520, protein:44,
    batchNote:'Makes 4 servings. Serve over rice with yogurt drizzle. Keeps 4 days.',
    ingredients:[
      { name:'chicken thighs', qty:20,   unit:'oz',    category:'protein' },
      { name:'Greek yogurt',   qty:8,    unit:'oz',    category:'dairy'   },
      { name:'basmati rice',   qty:1.5,  unit:'cups',  category:'grains'  },
      { name:'spinach',        qty:4,    unit:'oz',    category:'produce' },
      { name:'lemon',          qty:2,    unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:4,    unit:'',      category:'produce' },
      { name:'olive oil',      qty:2,    unit:'tbsp',  category:'pantry'  },
      { name:'cumin',          qty:1,    unit:'tbsp',  category:'spices'  },
      { name:'smoked paprika', qty:1,    unit:'tsp',   category:'spices'  },
      { name:'turmeric',       qty:0.5,  unit:'tsp',   category:'spices'  },
      { name:'chili flakes',   qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Marinate chicken in olive oil, garlic, spices and lemon juice for 30+ min.',
      'Cook rice. Pan-fry or oven-bake chicken at 425°F for 20 min.',
      'Slice chicken. Season yogurt with garlic and lemon (tzatziki-style).',
      'Assemble bowls: rice, spinach, sliced chicken, yogurt drizzle.',
      'Portion into 4 containers.',
    ],
  },
  {
    id:'bd5', type:'dinner', emoji:'🍗', batch:true,
    name:'Teriyaki Chicken Meal Prep',
    tags:['asian','batch'],
    prepTime:30, cal:460, protein:40,
    batchNote:'Makes 4 servings. Broccoli stays crisp. Keeps 4 days in fridge.',
    ingredients:[
      { name:'chicken thighs', qty:20,   unit:'oz',    category:'protein' },
      { name:'basmati rice',   qty:1.5,  unit:'cups',  category:'grains'  },
      { name:'broccoli',       qty:8,    unit:'oz',    category:'produce' },
      { name:'soy sauce',      qty:3,    unit:'tbsp',  category:'pantry'  },
      { name:'honey',          qty:2,    unit:'tbsp',  category:'pantry'  },
      { name:'garlic cloves',  qty:2,    unit:'',      category:'produce' },
      { name:'fresh ginger',   qty:0.5,  unit:'oz',    category:'produce' },
      { name:'sesame oil',     qty:1,    unit:'tsp',   category:'pantry'  },
    ],
    steps:[
      'Mix soy sauce, honey, garlic and ginger as marinade. Coat chicken.',
      'Cook rice.',
      'Pan-fry or bake chicken at 400°F for 20-25 min.',
      'Steam or stir-fry broccoli 4-5 min.',
      'Slice chicken. Portion into 4 meal prep containers with rice and broccoli.',
    ],
  },
  {
    id:'bd6', type:'dinner', emoji:'🥘', batch:true,
    name:'Chickpea & Spinach Curry',
    tags:['spicy','indian','vegetarian','batch'],
    prepTime:30, cal:440, protein:18,
    batchNote:'Makes 4 servings. Great budget-friendly week. Keeps 5 days.',
    ingredients:[
      { name:'canned chickpeas',qty:30,  unit:'oz',    category:'canned'  },
      { name:'canned diced tomatoes',qty:14,unit:'oz', category:'canned'  },
      { name:'coconut milk',   qty:13.5, unit:'fl oz', category:'canned'  },
      { name:'spinach',        qty:5,    unit:'oz',    category:'produce' },
      { name:'onion',          qty:1,    unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:3,    unit:'',      category:'produce' },
      { name:'fresh ginger',   qty:0.75, unit:'oz',    category:'produce' },
      { name:'basmati rice',   qty:1.5,  unit:'cups',  category:'grains'  },
      { name:'garam masala',   qty:1,    unit:'tbsp',  category:'spices'  },
      { name:'chili powder',   qty:1,    unit:'tsp',   category:'spices'  },
      { name:'turmeric',       qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Cook rice. Fry onion 5 min. Add garlic, ginger and spices 2 min.',
      'Add tomatoes and coconut milk. Simmer 8 min.',
      'Add chickpeas. Simmer 10 min until sauce thickens.',
      'Stir in spinach until wilted. Season.',
      'Portion into 4 containers with rice.',
    ],
  },
  {
    id:'bd7', type:'dinner', emoji:'🍝', batch:true,
    name:'Beef Bolognese',
    tags:['red-meat','batch'],
    prepTime:40, cal:510, protein:32,
    batchNote:'Makes 4 servings. Serve over pasta. Freezes well.',
    ingredients:[
      { name:'ground beef',    qty:16,   unit:'oz',    category:'protein' },
      { name:'canned diced tomatoes',qty:28,unit:'oz', category:'canned'  },
      { name:'pasta',          qty:8,    unit:'oz',    category:'grains'  },
      { name:'onion',          qty:1,    unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:3,    unit:'',      category:'produce' },
      { name:'olive oil',      qty:1,    unit:'tbsp',  category:'pantry'  },
      { name:'Italian seasoning',qty:2,  unit:'tsp',   category:'spices'  },
      { name:'chili flakes',   qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Cook pasta. Fry onion in oil 5 min. Add garlic 1 min.',
      'Add beef, break up and brown 6-7 min.',
      'Add tomatoes, Italian seasoning and chili flakes.',
      'Simmer 20 min until rich and thick. Season well.',
      'Serve over pasta. Portion remaining sauce for later.',
    ],
  },
  {
    id:'bd8', type:'dinner', emoji:'🥜', batch:true,
    name:'Thai Peanut Chicken',
    tags:['spicy','thai','batch'],
    prepTime:30, cal:580, protein:38,
    batchNote:'Makes 4 servings. Rich sauce — great over rice. Keeps 4 days.',
    ingredients:[
      { name:'chicken thighs', qty:20,   unit:'oz',    category:'protein' },
      { name:'coconut milk',   qty:13.5, unit:'fl oz', category:'canned'  },
      { name:'peanut butter',  qty:4,    unit:'tbsp',  category:'pantry'  },
      { name:'soy sauce',      qty:3,    unit:'tbsp',  category:'pantry'  },
      { name:'sriracha',       qty:2,    unit:'tsp',   category:'pantry'  },
      { name:'lime',           qty:2,    unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:2,    unit:'',      category:'produce' },
      { name:'basmati rice',   qty:1.5,  unit:'cups',  category:'grains'  },
      { name:'spinach',        qty:2,    unit:'oz',    category:'produce' },
    ],
    steps:[
      'Cook rice. Cube chicken; pan-fry 5-6 min until golden. Set aside.',
      'Whisk coconut milk, peanut butter, soy sauce, sriracha, lime juice and garlic.',
      'Pour sauce over chicken in pan. Simmer 10 min until thick.',
      'Stir in spinach. Season.',
      'Portion into 4 containers with rice.',
    ],
  },
  {
    id:'bd9', type:'dinner', emoji:'🌮', batch:true,
    name:'Chicken Fajita Bowls',
    tags:['spicy','batch'],
    prepTime:30, cal:490, protein:40,
    batchNote:'Makes 4 servings. Pack with tortillas and cheese on the side. Keeps 4 days.',
    ingredients:[
      { name:'chicken thighs', qty:20,   unit:'oz',    category:'protein' },
      { name:'bell pepper',    qty:2,    unit:'',      category:'produce' },
      { name:'onion',          qty:2,    unit:'',      category:'produce' },
      { name:'flour tortillas',qty:4,    unit:'',      category:'grains'  },
      { name:'lime',           qty:2,    unit:'',      category:'produce' },
      { name:'shredded cheddar',qty:4,   unit:'oz',    category:'dairy'   },
      { name:'cumin',          qty:1,    unit:'tbsp',  category:'spices'  },
      { name:'chili powder',   qty:1,    unit:'tsp',   category:'spices'  },
      { name:'smoked paprika', qty:1,    unit:'tsp',   category:'spices'  },
      { name:'olive oil',      qty:2,    unit:'tbsp',  category:'pantry'  },
    ],
    steps:[
      'Slice chicken, peppers and onion into strips.',
      'Toss everything in spices and olive oil.',
      'Cook on high heat in a large pan or griddle, 8-10 min, until charred.',
      'Squeeze lime over. Portion into 4 bowls.',
      'Serve with warmed tortillas and cheese.',
    ],
  },
  {
    id:'bd10', type:'dinner', emoji:'🍲', batch:true,
    name:'Red Lentil Soup',
    tags:['indian','vegetarian','budget','batch'],
    prepTime:30, cal:380, protein:22,
    batchNote:'Makes 4 servings. Great with bread. Very cheap week. Keeps 5 days.',
    ingredients:[
      { name:'red lentils',    qty:1.5,  unit:'cups',  category:'pantry'  },
      { name:'canned diced tomatoes',qty:28,unit:'oz', category:'canned'  },
      { name:'onion',          qty:1,    unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:4,    unit:'',      category:'produce' },
      { name:'spinach',        qty:4,    unit:'oz',    category:'produce' },
      { name:'olive oil',      qty:2,    unit:'tbsp',  category:'pantry'  },
      { name:'cumin',          qty:1.5,  unit:'tsp',   category:'spices'  },
      { name:'garam masala',   qty:1,    unit:'tsp',   category:'spices'  },
      { name:'chili powder',   qty:1,    unit:'tsp',   category:'spices'  },
      { name:'turmeric',       qty:0.5,  unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Fry onion in oil 5 min. Add garlic and all spices, cook 1 min.',
      'Add rinsed lentils, tomatoes and 3 cups water.',
      'Bring to boil, then simmer 20 min until lentils are soft.',
      'Stir in spinach until wilted. Season generously.',
      'Portion into 4 containers. Serve with bread.',
    ],
  },
  {
    id:'bd11', type:'dinner', emoji:'🍛', batch:true,
    name:'Chicken Tikka Masala',
    tags:['spicy','indian','batch'],
    prepTime:40, cal:560, protein:42,
    batchNote:'Makes 4 servings. Serve over rice. Keeps 4 days in fridge.',
    ingredients:[
      { name:'chicken thighs', qty:20,   unit:'oz',    category:'protein' },
      { name:'canned diced tomatoes',qty:14,unit:'oz', category:'canned'  },
      { name:'Greek yogurt',   qty:8,    unit:'oz',    category:'dairy'   },
      { name:'heavy cream',    qty:3,    unit:'fl oz', category:'dairy'   },
      { name:'tikka masala paste',qty:3, unit:'tbsp',  category:'pantry'  },
      { name:'onion',          qty:1,    unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:3,    unit:'',      category:'produce' },
      { name:'fresh ginger',   qty:0.75, unit:'oz',    category:'produce' },
      { name:'basmati rice',   qty:1.5,  unit:'cups',  category:'grains'  },
      { name:'garam masala',   qty:1,    unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Cube chicken. Marinate in yogurt and half the tikka paste 30 min.',
      'Cook rice. Grill or pan-fry chicken in batches until charred; set aside.',
      'Fry onion 5 min. Add garlic, ginger and remaining tikka paste 2 min.',
      'Add tomatoes, simmer 10 min. Add chicken and cream. Simmer 8 min.',
      'Finish with garam masala. Portion into 4 containers with rice.',
    ],
  },
  {
    id:'bd12', type:'dinner', emoji:'🥢', batch:true,
    name:'Korean Ground Beef Bowls',
    tags:['asian','red-meat','batch'],
    prepTime:25, cal:480, protein:34,
    batchNote:'Makes 4 servings. Fast and cheap. Great over rice. Keeps 4 days.',
    ingredients:[
      { name:'ground beef',    qty:16,   unit:'oz',    category:'protein' },
      { name:'basmati rice',   qty:1.5,  unit:'cups',  category:'grains'  },
      { name:'garlic cloves',  qty:4,    unit:'',      category:'produce' },
      { name:'fresh ginger',   qty:0.75, unit:'oz',    category:'produce' },
      { name:'soy sauce',      qty:3,    unit:'tbsp',  category:'pantry'  },
      { name:'brown sugar',    qty:2,    unit:'tbsp',  category:'pantry'  },
      { name:'sesame oil',     qty:1,    unit:'tsp',   category:'pantry'  },
      { name:'spinach',        qty:4,    unit:'oz',    category:'produce' },
      { name:'chili flakes',   qty:1,    unit:'tsp',   category:'spices'  },
    ],
    steps:[
      'Cook rice.',
      'Brown beef in a hot pan, breaking up, 6-7 min.',
      'Add garlic and ginger. Cook 1 min.',
      'Add soy sauce, brown sugar, sesame oil and chili flakes. Toss well.',
      'Stir in spinach until wilted.',
      'Portion into 4 containers with rice.',
    ],
  },
  {
    id:'bd13', type:'dinner', emoji:'🍝', batch:true,
    name:'Spicy Chickpea Pasta',
    tags:['spicy','vegetarian','budget','batch'],
    prepTime:30, cal:440, protein:18,
    batchNote:'Makes 4 servings. Cheap vegetarian week. Keeps 4 days.',
    ingredients:[
      { name:'canned chickpeas',qty:30,  unit:'oz',    category:'canned'  },
      { name:'canned diced tomatoes',qty:28,unit:'oz', category:'canned'  },
      { name:'pasta',          qty:8,    unit:'oz',    category:'grains'  },
      { name:'onion',          qty:1,    unit:'',      category:'produce' },
      { name:'garlic cloves',  qty:4,    unit:'',      category:'produce' },
      { name:'olive oil',      qty:2,    unit:'tbsp',  category:'pantry'  },
      { name:'chili flakes',   qty:1,    unit:'tsp',   category:'spices'  },
      { name:'Italian seasoning',qty:1,  unit:'tsp',   category:'spices'  },
      { name:'spinach',        qty:3,    unit:'oz',    category:'produce' },
    ],
    steps:[
      'Cook pasta. Fry onion in oil 5 min. Add garlic and chili flakes 1 min.',
      'Add tomatoes and chickpeas. Simmer 15 min until sauce thickens.',
      'Add Italian seasoning and spinach. Simmer 2 more min.',
      'Toss with drained pasta. Portion into 4 containers.',
    ],
  },
];

// ─────────────────────────────────────────────
// LOOKUP
// ─────────────────────────────────────────────
const ALL_MEALS = {};
[...BREAKFASTS, ...LUNCHES, ...DINNERS].forEach(m => { ALL_MEALS[m.id] = m; });

// ─────────────────────────────────────────────
// ROTATION  (13 weeks, Mon–Sun)
// Lunch key: 'leftover' = pack last night's dinner or batch leftovers
// Dinner serving amounts are handled in app.js via DINNER_SERVINGS
// ─────────────────────────────────────────────
const ROTATION = [

  // ── Week 1 · Indian · Butter Chicken batch
  // Hero: chicken thighs, canned tomatoes, onion, garlic, garam masala, rice
  [
    { b:'b1', l:'leftover', d:'d2'  },  // Mon  – Teriyaki Chicken
    { b:'b3', l:'l1',       d:'d5'  },  // Tue  – Chana Masala
    { b:'b7', l:'l3',       d:'bd1' },  // Wed  – BATCH Butter Chicken
    { b:'b1', l:'leftover', d:'d6'  },  // Thu  – Dal Tadka
    { b:'b2', l:'leftover', d:'d7'  },  // Fri  – Egg Fried Rice
    { b:'b5', l:'leftover', d:'d3'  },  // Sat  – Lemon Garlic Chicken
    { b:'b4', l:'leftover', d:'d1'  },  // Sun  – Thai Basil Chicken
  ],

  // ── Week 2 · Thai · Thai Green Curry batch
  // Hero: chicken thighs, coconut milk, bell pepper, lime, rice
  [
    { b:'b7', l:'leftover', d:'d4'  },  // Mon  – Spicy Chicken Stir-Fry
    { b:'b3', l:'l2',       d:'d8'  },  // Tue  – Shakshuka
    { b:'b1', l:'l1',       d:'bd2' },  // Wed  – BATCH Thai Green Curry
    { b:'b5', l:'leftover', d:'d12' },  // Thu  – Spicy Peanut Noodles
    { b:'b2', l:'leftover', d:'d5'  },  // Fri  – Chana Masala
    { b:'b8', l:'leftover', d:'d2'  },  // Sat  – Teriyaki Chicken
    { b:'b6', l:'leftover', d:'d7'  },  // Sun  – Egg Fried Rice
  ],

  // ── Week 3 · Tex-Mex · Beef Chili batch
  // Hero: ground beef, black beans, canned tomatoes, tortillas, lime
  [
    { b:'b2', l:'leftover', d:'d9'  },  // Mon  – Spicy Beef Tacos
    { b:'b5', l:'l2',       d:'d11' },  // Tue  – Black Bean Quesadilla
    { b:'b1', l:'l3',       d:'bd3' },  // Wed  – BATCH Beef Chili
    { b:'b7', l:'leftover', d:'d15' },  // Thu  – Black Bean & Rice Bowl
    { b:'b3', l:'leftover', d:'d8'  },  // Fri  – Shakshuka
    { b:'b4', l:'leftover', d:'d9'  },  // Sat  – Spicy Beef Tacos
    { b:'b6', l:'leftover', d:'d10' },  // Sun  – Korean Beef Bowl
  ],

  // ── Week 4 · Mediterranean · Chicken Shawarma batch
  // Hero: chicken thighs, Greek yogurt, lemon, spinach, cumin
  [
    { b:'b3', l:'leftover', d:'d13' },  // Mon  – Mediterranean Chicken Bowl
    { b:'b7', l:'l1',       d:'d6'  },  // Tue  – Dal Tadka
    { b:'b5', l:'l3',       d:'bd4' },  // Wed  – BATCH Chicken Shawarma Bowls
    { b:'b1', l:'leftover', d:'d5'  },  // Thu  – Chana Masala
    { b:'b2', l:'leftover', d:'d3'  },  // Fri  – Lemon Garlic Chicken
    { b:'b8', l:'leftover', d:'d13' },  // Sat  – Mediterranean Chicken Bowl
    { b:'b6', l:'leftover', d:'d14' },  // Sun  – One-Pan Garlic Rice & Chicken
  ],

  // ── Week 5 · Asian · Teriyaki Meal Prep batch
  // Hero: chicken thighs, soy sauce, ginger, honey, rice, broccoli
  [
    { b:'b1', l:'leftover', d:'d2'  },  // Mon  – Teriyaki Chicken Bowl
    { b:'b3', l:'l2',       d:'d7'  },  // Tue  – Egg Fried Rice
    { b:'b7', l:'l1',       d:'bd5' },  // Wed  – BATCH Teriyaki Chicken Meal Prep
    { b:'b5', l:'leftover', d:'d10' },  // Thu  – Korean Beef Bowl
    { b:'b2', l:'leftover', d:'d12' },  // Fri  – Spicy Peanut Noodles
    { b:'b4', l:'leftover', d:'d1'  },  // Sat  – Thai Basil Chicken
    { b:'b6', l:'leftover', d:'d4'  },  // Sun  – Spicy Chicken Stir-Fry
  ],

  // ── Week 6 · Indian · Chickpea Spinach Curry batch
  // Hero: canned chickpeas, coconut milk, spinach, onion, garam masala, rice
  [
    { b:'b5', l:'leftover', d:'d5'  },  // Mon  – Chana Masala
    { b:'b8', l:'l2',       d:'d3'  },  // Tue  – Lemon Garlic Chicken
    { b:'b3', l:'l3',       d:'bd6' },  // Wed  – BATCH Chickpea & Spinach Curry
    { b:'b1', l:'leftover', d:'d6'  },  // Thu  – Dal Tadka
    { b:'b7', l:'leftover', d:'d1'  },  // Fri  – Thai Basil Chicken
    { b:'b2', l:'leftover', d:'d5'  },  // Sat  – Chana Masala
    { b:'b4', l:'leftover', d:'d14' },  // Sun  – One-Pan Garlic Rice & Chicken
  ],

  // ── Week 7 · Italian · Beef Bolognese batch
  // Hero: ground beef, canned tomatoes, pasta, garlic, onion
  [
    { b:'b6', l:'leftover', d:'d10' },  // Mon  – Korean Beef Bowl
    { b:'b3', l:'l1',       d:'d8'  },  // Tue  – Shakshuka
    { b:'b1', l:'l2',       d:'bd7' },  // Wed  – BATCH Beef Bolognese
    { b:'b7', l:'leftover', d:'d12' },  // Thu  – Spicy Peanut Noodles
    { b:'b5', l:'leftover', d:'d11' },  // Fri  – Black Bean Quesadilla
    { b:'b2', l:'leftover', d:'d9'  },  // Sat  – Spicy Beef Tacos
    { b:'b4', l:'leftover', d:'d15' },  // Sun  – Black Bean & Rice Bowl
  ],

  // ── Week 8 · Thai · Thai Peanut Chicken batch
  // Hero: chicken thighs, peanut butter, coconut milk, soy sauce, rice
  [
    { b:'b7', l:'leftover', d:'d12' },  // Mon  – Spicy Peanut Noodles
    { b:'b1', l:'l3',       d:'d1'  },  // Tue  – Thai Basil Chicken
    { b:'b5', l:'l2',       d:'bd8' },  // Wed  – BATCH Thai Peanut Chicken
    { b:'b3', l:'leftover', d:'d4'  },  // Thu  – Spicy Chicken Stir-Fry
    { b:'b8', l:'leftover', d:'d7'  },  // Fri  – Egg Fried Rice
    { b:'b2', l:'leftover', d:'d2'  },  // Sat  – Teriyaki Chicken Bowl
    { b:'b6', l:'leftover', d:'d5'  },  // Sun  – Chana Masala
  ],

  // ── Week 9 · Fajita · Chicken Fajita Bowls batch
  // Hero: chicken thighs, bell peppers, onion, lime, cumin, tortillas
  [
    { b:'b4', l:'leftover', d:'d4'  },  // Mon  – Spicy Chicken Stir-Fry
    { b:'b6', l:'l1',       d:'d8'  },  // Tue  – Shakshuka
    { b:'b1', l:'l3',       d:'bd9' },  // Wed  – BATCH Chicken Fajita Bowls
    { b:'b3', l:'leftover', d:'d5'  },  // Thu  – Chana Masala
    { b:'b7', l:'leftover', d:'d3'  },  // Fri  – Lemon Garlic Chicken
    { b:'b5', l:'leftover', d:'d11' },  // Sat  – Black Bean Quesadilla
    { b:'b2', l:'leftover', d:'d13' },  // Sun  – Mediterranean Chicken Bowl
  ],

  // ── Week 10 · Indian · Red Lentil Soup batch
  // Hero: red lentils, canned tomatoes, spinach, onion, garlic — cheap week
  [
    { b:'b1', l:'leftover', d:'d6'  },  // Mon  – Dal Tadka
    { b:'b8', l:'l2',       d:'d14' },  // Tue  – One-Pan Garlic Rice & Chicken
    { b:'b3', l:'l1',       d:'bd10'},  // Wed  – BATCH Red Lentil Soup
    { b:'b7', l:'leftover', d:'d5'  },  // Thu  – Chana Masala
    { b:'b5', l:'leftover', d:'d2'  },  // Fri  – Teriyaki Chicken Bowl
    { b:'b2', l:'leftover', d:'d7'  },  // Sat  – Egg Fried Rice
    { b:'b4', l:'leftover', d:'d1'  },  // Sun  – Thai Basil Chicken
  ],

  // ── Week 11 · Indian · Chicken Tikka Masala batch
  // Hero: chicken thighs, Greek yogurt, tikka paste, canned tomatoes, rice
  [
    { b:'b3', l:'leftover', d:'d1'  },  // Mon  – Thai Basil Chicken
    { b:'b7', l:'l3',       d:'d5'  },  // Tue  – Chana Masala
    { b:'b1', l:'l1',       d:'bd11'},  // Wed  – BATCH Chicken Tikka Masala
    { b:'b5', l:'leftover', d:'d6'  },  // Thu  – Dal Tadka
    { b:'b8', l:'leftover', d:'d14' },  // Fri  – One-Pan Garlic Rice & Chicken
    { b:'b2', l:'leftover', d:'d3'  },  // Sat  – Lemon Garlic Chicken
    { b:'b6', l:'leftover', d:'d7'  },  // Sun  – Egg Fried Rice
  ],

  // ── Week 12 · Asian · Korean Ground Beef Bowls batch
  // Hero: ground beef, soy sauce, ginger, garlic, sesame oil, spinach, rice
  [
    { b:'b5', l:'leftover', d:'d10' },  // Mon  – Korean Beef Bowl
    { b:'b1', l:'l2',       d:'d7'  },  // Tue  – Egg Fried Rice
    { b:'b3', l:'l1',       d:'bd12'},  // Wed  – BATCH Korean Ground Beef
    { b:'b7', l:'leftover', d:'d4'  },  // Thu  – Spicy Chicken Stir-Fry
    { b:'b2', l:'leftover', d:'d12' },  // Fri  – Spicy Peanut Noodles
    { b:'b8', l:'leftover', d:'d9'  },  // Sat  – Spicy Beef Tacos
    { b:'b4', l:'leftover', d:'d2'  },  // Sun  – Teriyaki Chicken Bowl
  ],

  // ── Week 13 · Budget · Spicy Chickpea Pasta batch
  // Hero: canned chickpeas, canned tomatoes, pasta, garlic, onion — cheap vegetarian week
  [
    { b:'b6', l:'leftover', d:'d11' },  // Mon  – Black Bean Quesadilla
    { b:'b3', l:'l3',       d:'d8'  },  // Tue  – Shakshuka
    { b:'b1', l:'l2',       d:'bd13'},  // Wed  – BATCH Spicy Chickpea Pasta
    { b:'b7', l:'leftover', d:'d5'  },  // Thu  – Chana Masala
    { b:'b5', l:'leftover', d:'d3'  },  // Fri  – Lemon Garlic Chicken
    { b:'b2', l:'leftover', d:'d15' },  // Sat  – Black Bean & Rice Bowl
    { b:'b8', l:'leftover', d:'d6'  },  // Sun  – Dal Tadka
  ],
];
