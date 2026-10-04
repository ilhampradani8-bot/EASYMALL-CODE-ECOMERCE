import type { APIRoute } from 'astro';

export const prerender = false;

// In-memory cache
let productsCache: { time: number; data: any } | null = null;
const CACHE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

const LOGO_MAPPING: Record<string, string> = {
  'alight motion': '/gambar/logo/Alight-Motion-Logo.png',
  'ali-15': '/gambar/logo/Alight-Motion-Logo.png',

  'apple music': '/gambar/logo/apple_music.jpg',
  'app-19': '/gambar/logo/apple_music.jpg',
  'apple': '/gambar/logo/apple-logo.png',

  'bstation': '/gambar/logo/Logo-Bstation.png',
  'bst-16': '/gambar/logo/Logo-Bstation.png',

  'canva': '/gambar/logo/canva-logo.jpeg',
  'can-6': '/gambar/logo/canva-logo.jpeg',

  'capcut': '/gambar/logo/capcut-logo.png',
  'capcut private': '/gambar/logo/capcut-logo.png',
  'cap-2': '/gambar/logo/capcut-logo.png',

  'chatgpt': '/gambar/logo/chatgpt-logo-50000.png',
  'cha-18': '/gambar/logo/chatgpt-logo-50000.png',

  'disney': '/gambar/logo/disneyPlusLogo.jpg',
  'disney+': '/gambar/logo/disneyPlusLogo.jpg',
  'dis-12': '/gambar/logo/disneyPlusLogo.jpg',

  'getcontact': '/gambar/logo/get-contact.jpg',
  'get-14': '/gambar/logo/get-contact.jpg',

  'hbo max': '/gambar/logo/hbo-max-logo.jpg',
  'hbo max premium': '/gambar/logo/hbo-max-logo.jpg',
  'hbo-22': '/gambar/logo/hbo-max-logo.jpg',

  'imei': '/gambar/logo/easymall-logo.png',
  'unimei': '/gambar/logo/easymall-logo.png',

  'iqiyi': '/gambar/logo/iqiyi-logo.jpeg',
  'iqi-17': '/gambar/logo/iqiyi-logo.jpeg',

  'kiro ai': '/gambar/logo/kiro-ai-logo.jpeg',
  'kiro-ai': '/gambar/logo/kiro-ai-logo.jpeg',

  'lisensi windows': '/gambar/logo/easymall-logo.png',
  'lis-23': '/gambar/logo/easymall-logo.png',

  'netflix': '/gambar/logo/netflix-logo.png',
  'netflix premium': '/gambar/logo/netflix-logo.png',
  'net-1': '/gambar/logo/netflix-logo.png',

  'picsart': '/gambar/logo/picsart-logo.png',
  'pic-21': '/gambar/logo/picsart-logo.png',

  'mobile legends': '/gambar/logo/mobilelegend-logo.jpeg',
  'mobile legends bang bang': '/gambar/logo/mobilelegend-logo.jpeg',
  'mlbb': '/gambar/logo/mobilelegend-logo.jpeg',

  'free fire': '/gambar/logo/freefiree-logo.png',
  'ff': '/gambar/logo/freefiree-logo.png',

  'call of duty': '/gambar/logo/Call-of-Duty-Logo.png',
  'codm': '/gambar/logo/Call-of-Duty-Logo.png',

  'valorant': '/gambar/logo/valorant-logo.png',

  'arena of valor': '/gambar/logo/Arena_of_Valor_logo.png',
  'aov': '/gambar/logo/Arena_of_Valor_logo.png',

  'laplace m': '/gambar/logo/laplace-game-logo.png',
  'laplace': '/gambar/logo/laplace-game-logo.png',

  'sausage man': '/gambar/logo/sausageman-logo.jpeg',

  'pln': '/gambar/logo/Logo_PLN.png',
  'token pln': '/gambar/logo/Logo_PLN.png',

  'telkomsel': '/gambar/logo/telkomsel-logo.png',
  'xl': '/gambar/logo/XL-logo.png',
  'axis': '/gambar/logo/axis-logo.png',
  'indosat': '/gambar/logo/indosat-ooredoo.png',
  'tri': '/gambar/logo/tri-logo.jpg',
  'smartfren': '/gambar/logo/smartfren-logo.jpeg',

  'domain': '/gambar/logo/domainname-api-logo.png',
  'ssl': '/gambar/logo/domainname-api-logo.png',

  'ip academy': '/gambar/logo/ip_academy_logo.png'
};

function getLocalLogo(product: any): string {
  const codeKey = String(product.code || '').toLowerCase().trim();
  const nameKey = String(product.name || '').toLowerCase().trim();

  if (LOGO_MAPPING[codeKey]) return LOGO_MAPPING[codeKey];
  if (LOGO_MAPPING[nameKey]) return LOGO_MAPPING[nameKey];

  for (const [key, path] of Object.entries(LOGO_MAPPING)) {
    if (nameKey.includes(key) || codeKey.includes(key)) {
      return path;
    }
  }

  return '/gambar/logo/easymall-logo.png';
}

export const GET: APIRoute = async () => {
  const now = Date.now();
  if (productsCache && (now - productsCache.time < CACHE_DURATION_MS)) {
    return new Response(JSON.stringify(productsCache.data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=60'
      }
    });
  }

  const markupNominal = parseFloat(process.env.PRICE_MARKUP_NOMINAL || '0');
  const markupPercent = parseFloat(process.env.PRICE_MARKUP_PERCENT || '25');

  const koalaKey = process.env.KOALASTORE_API_KEY || 'kb_live_af0475f0cd12d8ff9ceb5b087a8977ef09303d9f';
  const miracleKey = (process.env.MIRACLE_GAMING_API_KEY || '').trim();

  const finalProducts: any[] = [];
  const addedCodes = new Set<string>();

  // 1. Fetch live products from KoalaStore
  try {
    const koalaRes = await fetch('https://koalastore.digital/api/v1/products', {
      headers: {
        'X-API-KEY': koalaKey,
        'User-Agent': 'Mozilla/5.0'
      }
    });
    if (koalaRes.ok) {
      const koalaData = await koalaRes.json();
      if (koalaData.success && Array.isArray(koalaData.data)) {
        for (const item of koalaData.data) {
          const product = { ...item };
          if (Array.isArray(product.variants) && product.variants.length > 0) {
            product.variants = product.variants.map((v: any) => {
              const basePrice = parseFloat(v.price || 0);
              const markedPrice = basePrice + markupNominal + (basePrice * markupPercent / 100);
              const markedOriginal = v.original_price
                ? (parseFloat(v.original_price) + markupNominal + (parseFloat(v.original_price) * markupPercent / 100))
                : markedPrice;
              return {
                ...v,
                price: Math.round(markedPrice),
                original_price: Math.round(markedOriginal)
              };
            });
          }

          if (Array.isArray(product.variants) && product.variants.length > 0) {
            const validPrices = product.variants
              .map((v: any) => parseFloat(v.price || 0))
              .filter((p: number) => p > 0);
            product.price = validPrices.length > 0 ? Math.min(...validPrices) : (parseFloat(product.price || 0) || 0);
          } else {
            product.price = parseFloat(product.price || 0) || 0;
          }
          product.provider = 'koalastore';

          // Override image with clean local logo
          product.image = getLocalLogo(product);
          product.image_url = product.image;
          product.images = [product.image];

          let slug = 'digital';
          if (product.category) {
            const catLower = String(product.category).toLowerCase();
            if (catLower.includes('music')) slug = 'music';
            else if (catLower.includes('productivity')) slug = 'productivity';
            else if (catLower.includes('streaming')) slug = 'digital';
            else if (catLower.includes('creative')) slug = 'productivity';
            else if (catLower.includes('game')) slug = 'game';
          }
          product.category_slug = slug;
          
          finalProducts.push(product);
          addedCodes.add(product.code);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching KoalaStore products:', err);
  }

  // 2. Fetch live products from Miracle Gaming if API Key is configured
  if (miracleKey) {
    try {
      const miracleRes = await fetch('https://api.miraclegaming.store/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: miracleKey })
      });
      if (miracleRes.ok) {
        const miracleJson = await miracleRes.json();
        if (miracleJson && (miracleJson.status || miracleJson.success) && Array.isArray(miracleJson.data)) {
          const categoryMap = new Map<string, any[]>();
          for (const item of miracleJson.data) {
            const cat = item.kategori || 'Game Top Up';
            if (!categoryMap.has(cat)) categoryMap.set(cat, []);
            categoryMap.get(cat)!.push(item);
          }

          for (const [catName, items] of categoryMap.entries()) {
            const cleanCode = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            if (!addedCodes.has(cleanCode)) {
              const variants = items.map((i: any) => {
                const basePrice = parseFloat(i.harga || i.price || 0);
                const markedPrice = basePrice > 0 ? (basePrice + markupNominal + (basePrice * markupPercent / 100)) : 0;
                return {
                  code_variant: i.id || i.service_id,
                  name: i.nama_layanan || i.name,
                  price: Math.round(markedPrice),
                  original_price: Math.round(markedPrice * 1.15)
                };
              });

              const validPrices = variants.map(v => v.price).filter(p => p > 0);
              const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 10000;

              const miracleProduct = {
                code: cleanCode,
                name: catName,
                category: 'Top Up Game',
                category_slug: 'game',
                description: `Top up ${catName} resmi instan 24 jam pengiriman otomatis via Miracle Gaming API.`,
                badge: 'INSTAN',
                price: minPrice,
                image: getLocalLogo({ code: cleanCode, name: catName }),
                provider: 'miraclegaming',
                variants: variants
              };

              finalProducts.push(miracleProduct);
              addedCodes.add(cleanCode);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Miracle Gaming Fetch Info:', err);
    }
  }

  // 3. Complete Built-in Game Catalog & Digital Services
  const additionalProducts = [
    // --- TOP UP GAMES ---
    {
      code: 'mlbb',
      name: 'Mobile Legends: Bang Bang',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up Diamond Mobile Legends tercepat 24 jam legal & aman. Masukkan User ID dan Zone ID.',
      badge: 'POPULER',
      price: 1500,
      image: '/gambar/logo/mobilelegend-logo.jpeg',
      provider: 'easymall',
      variants: [
        { code_variant: 'ml5', name: '5 Diamonds', price: 1500, original_price: 2000 },
        { code_variant: 'ml12', name: '12 Diamonds', price: 3500, original_price: 4500 },
        { code_variant: 'ml19', name: '19 Diamonds', price: 5500, original_price: 6500 },
        { code_variant: 'ml28', name: '28 Diamonds', price: 8000, original_price: 9500 },
        { code_variant: 'ml44', name: '44 Diamonds', price: 12000, original_price: 14000 },
        { code_variant: 'ml59', name: '59 Diamonds', price: 16000, original_price: 18500 },
        { code_variant: 'ml86', name: '86 Diamonds', price: 23000, original_price: 26000 },
        { code_variant: 'ml172', name: '172 Diamonds', price: 45000, original_price: 50000 },
        { code_variant: 'ml257', name: '257 Diamonds', price: 67000, original_price: 75000 },
        { code_variant: 'ml344', name: '344 Diamonds', price: 90000, original_price: 100000 },
        { code_variant: 'ml429', name: '429 Diamonds', price: 112000, original_price: 125000 },
        { code_variant: 'ml514', name: '514 Diamonds', price: 134000, original_price: 148000 },
        { code_variant: 'ml706', name: '706 Diamonds', price: 180000, original_price: 200000 },
        { code_variant: 'ml2195', name: '2195 Diamonds', price: 540000, original_price: 590000 },
        { code_variant: 'mlpass', name: 'Weekly Diamond Pass', price: 28500, original_price: 32000 },
        { code_variant: 'mltwilight', name: 'Twilight Pass', price: 145000, original_price: 160000 }
      ]
    },
    {
      code: 'ff',
      name: 'Free Fire',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up Diamond Free Fire instant pengiriman 1 detik cukup nomor Player ID.',
      badge: 'INSTAN',
      price: 1000,
      image: '/gambar/logo/freefiree-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'ff5', name: '5 Diamonds', price: 1000, original_price: 1500 },
        { code_variant: 'ff12', name: '12 Diamonds', price: 2000, original_price: 3000 },
        { code_variant: 'ff50', name: '50 Diamonds', price: 7000, original_price: 8500 },
        { code_variant: 'ff70', name: '70 Diamonds', price: 9800, original_price: 11500 },
        { code_variant: 'ff140', name: '140 Diamonds', price: 19500, original_price: 22000 },
        { code_variant: 'ff355', name: '355 Diamonds', price: 48000, original_price: 55000 },
        { code_variant: 'ff720', name: '720 Diamonds', price: 95000, original_price: 110000 },
        { code_variant: 'ff1440', name: '1440 Diamonds', price: 190000, original_price: 215000 },
        { code_variant: 'ff2180', name: '2180 Diamonds', price: 285000, original_price: 310000 },
        { code_variant: 'ff_member_week', name: 'Membership Mingguan', price: 30000, original_price: 35000 },
        { code_variant: 'ff_member_month', name: 'Membership Bulanan', price: 90000, original_price: 105000 }
      ]
    },
    {
      code: 'valorant',
      name: 'Valorant Points',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Beli Valorant Points VP murah resmi Riot Games Indonesia. Masukkan Riot ID (Nama#Tagline).',
      badge: 'TERLARIS',
      price: 55000,
      image: '/gambar/logo/valorant-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'vp475', name: '475 VP (Valorant Points)', price: 55000, original_price: 60000 },
        { code_variant: 'vp1000', name: '1000 VP (Valorant Points)', price: 112000, original_price: 125000 },
        { code_variant: 'vp2050', name: '2050 VP (Valorant Points)', price: 220000, original_price: 240000 },
        { code_variant: 'vp3650', name: '3650 VP (Valorant Points)', price: 385000, original_price: 420000 },
        { code_variant: 'vp5350', name: '5350 VP (Valorant Points)', price: 550000, original_price: 600000 },
        { code_variant: 'vp11000', name: '11000 VP (Valorant Points)', price: 1100000, original_price: 1200000 }
      ]
    },
    {
      code: 'codm',
      name: 'Call of Duty Mobile',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up CP Call of Duty Mobile CODM murah instan 24 Jam. Masukkan OpenID akun CODM Anda.',
      badge: 'INSTAN',
      price: 6000,
      image: '/gambar/logo/Call-of-Duty-Logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'cp31', name: '31 CP (Call of Duty Points)', price: 6000, original_price: 7500 },
        { code_variant: 'cp62', name: '62 CP (Call of Duty Points)', price: 12000, original_price: 14500 },
        { code_variant: 'cp128', name: '128 CP (Call of Duty Points)', price: 24000, original_price: 28000 },
        { code_variant: 'cp321', name: '321 CP (Call of Duty Points)', price: 58000, original_price: 65000 },
        { code_variant: 'cp645', name: '645 CP (Call of Duty Points)', price: 115000, original_price: 130000 },
        { code_variant: 'cp800', name: '800 CP (Call of Duty Points)', price: 140000, original_price: 155000 },
        { code_variant: 'cp1373', name: '1373 CP (Call of Duty Points)', price: 235000, original_price: 260000 },
        { code_variant: 'cp2060', name: '2060 CP (Call of Duty Points)', price: 345000, original_price: 380000 }
      ]
    },
    {
      code: 'pubgm',
      name: 'PUBG Mobile',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Beli UC PUBG Mobile resmi termurah proses instan cukup Player ID.',
      badge: 'POPULER',
      price: 7500,
      image: '/gambar/logo/easymall-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'uc30', name: '30 UC (Unknown Cash)', price: 7500, original_price: 9000 },
        { code_variant: 'uc60', name: '60 UC (Unknown Cash)', price: 14500, original_price: 17000 },
        { code_variant: 'uc325', name: '325 UC (Unknown Cash)', price: 72000, original_price: 80000 },
        { code_variant: 'uc660', name: '660 UC (Unknown Cash)', price: 142000, original_price: 160000 },
        { code_variant: 'uc1800', name: '1800 UC (Unknown Cash)', price: 355000, original_price: 390000 },
        { code_variant: 'uc3850', name: '3850 UC (Unknown Cash)', price: 710000, original_price: 780000 }
      ]
    },
    {
      code: 'genshin',
      name: 'Genshin Impact',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up Genesis Crystals & Blessing of the Welkin Moon Genshin Impact. Masukkan UID dan Server.',
      badge: 'TERLARIS',
      price: 16000,
      image: '/gambar/logo/easymall-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'gi60', name: '60 Genesis Crystals', price: 16000, original_price: 19000 },
        { code_variant: 'gi330', name: '300+30 Genesis Crystals', price: 79000, original_price: 89000 },
        { code_variant: 'gi1090', name: '980+110 Genesis Crystals', price: 245000, original_price: 270000 },
        { code_variant: 'gi2240', name: '1980+260 Genesis Crystals', price: 475000, original_price: 520000 },
        { code_variant: 'gi3880', name: '3280+600 Genesis Crystals', price: 780000, original_price: 860000 },
        { code_variant: 'gi8080', name: '6480+1600 Genesis Crystals', price: 1550000, original_price: 1700000 },
        { code_variant: 'gi_welkin', name: 'Blessing of the Welkin Moon', price: 79000, original_price: 89000 }
      ]
    },
    {
      code: 'roblox',
      name: 'Roblox Robux & Gift Card',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Beli Robux Roblox legal & voucher gift card instan pengiriman kilat.',
      badge: 'POPULER',
      price: 18000,
      image: '/gambar/logo/easymall-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'rbx80', name: '80 Robux', price: 18000, original_price: 22000 },
        { code_variant: 'rbx400', name: '400 Robux', price: 85000, original_price: 95000 },
        { code_variant: 'rbx800', name: '800 Robux', price: 165000, original_price: 185000 },
        { code_variant: 'rbx1700', name: '1700 Robux', price: 330000, original_price: 365000 },
        { code_variant: 'rbx4500', name: '4500 Robux', price: 820000, original_price: 900000 }
      ]
    },
    {
      code: 'steam-wallet',
      name: 'Steam Wallet Code IDR',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Voucher kode redeem saldo Steam Wallet Indonesia resmi 100% legal.',
      badge: 'TERPERCAYA',
      price: 14000,
      image: '/gambar/logo/easymall-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'steam12', name: 'Steam Wallet IDR 12.000', price: 14500, original_price: 16500 },
        { code_variant: 'steam45', name: 'Steam Wallet IDR 45.000', price: 52000, original_price: 58000 },
        { code_variant: 'steam60', name: 'Steam Wallet IDR 60.000', price: 69000, original_price: 76000 },
        { code_variant: 'steam90', name: 'Steam Wallet IDR 90.000', price: 103000, original_price: 115000 },
        { code_variant: 'steam120', name: 'Steam Wallet IDR 120.000', price: 136000, original_price: 150000 },
        { code_variant: 'steam250', name: 'Steam Wallet IDR 250.000', price: 278000, original_price: 300000 },
        { code_variant: 'steam400', name: 'Steam Wallet IDR 400.000', price: 445000, original_price: 480000 },
        { code_variant: 'steam600', name: 'Steam Wallet IDR 600.000', price: 660000, original_price: 710000 }
      ]
    },
    {
      code: 'aov',
      name: 'Arena of Valor',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up Voucher AOV Arena of Valor resmi pengiriman instan.',
      badge: 'INSTAN',
      price: 12000,
      image: '/gambar/logo/Arena_of_Valor_logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'aov40', name: '40 Voucher', price: 12000, original_price: 15000 },
        { code_variant: 'aov90', name: '90 Voucher', price: 24000, original_price: 28000 },
        { code_variant: 'aov230', name: '230 Voucher', price: 60000, original_price: 68000 },
        { code_variant: 'aov470', name: '470 Voucher', price: 118000, original_price: 130000 },
        { code_variant: 'aov950', name: '950 Voucher', price: 235000, original_price: 260000 }
      ]
    },
    {
      code: 'sausage',
      name: 'Sausage Man',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up Candies Sausage Man instan pengiriman otomatis.',
      badge: 'INSTAN',
      price: 15000,
      image: '/gambar/logo/sausageman-logo.jpeg',
      provider: 'easymall',
      variants: [
        { code_variant: 'sm60', name: '60 Candies', price: 16000, original_price: 19000 },
        { code_variant: 'sm180', name: '180 Candies', price: 47000, original_price: 54000 },
        { code_variant: 'sm316', name: '316 Candies', price: 79000, original_price: 89000 },
        { code_variant: 'sm686', name: '686 Candies', price: 165000, original_price: 185000 },
        { code_variant: 'sm1372', name: '1372 Candies', price: 325000, original_price: 360000 }
      ]
    },
    {
      code: 'laplace',
      name: 'Laplace M',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up Spirals Laplace M instan pengiriman kilat.',
      badge: 'INSTAN',
      price: 15000,
      image: '/gambar/logo/laplace-game-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'lp30', name: '30 Spirals', price: 15000, original_price: 18000 },
        { code_variant: 'lp60', name: '60 Spirals', price: 29000, original_price: 34000 },
        { code_variant: 'lp300', name: '300 Spirals', price: 140000, original_price: 160000 },
        { code_variant: 'lp680', name: '680 Spirals', price: 310000, original_price: 350000 }
      ]
    },

    // --- PULSA & DATA INTERNET (NON-REALTIME / DEV) ---
    {
      code: 'telkomsel',
      name: 'Telkomsel Pulsa & Paket Data',
      category: 'Pulsa & Data',
      category_slug: 'pulsa',
      description: 'Isi pulsa reguler & kuota internet Telkomsel Koin / Orbit (Tahap Pengembangan).',
      badge: 'TAHAP DEV',
      is_realtime: false,
      is_development: true,
      status_note: 'Non-Realtime / Tahap Pengembangan',
      price: 10000,
      image: '/gambar/logo/telkomsel-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'tsel10', name: 'Pulsa 10.000', price: 10800, original_price: 12000 },
        { code_variant: 'tsel25', name: 'Pulsa 25.000', price: 25700, original_price: 27000 },
        { code_variant: 'tsel50', name: 'Pulsa 50.000', price: 50500, original_price: 52500 },
        { code_variant: 'tsel100', name: 'Pulsa 100.000', price: 99800, original_price: 102000 },
        { code_variant: 'tsel_data_10gb', name: 'Kuota Data 10GB 30 Hari', price: 42000, original_price: 48000 }
      ]
    },
    {
      code: 'xl',
      name: 'XL Axiata Pulsa & Kuota',
      category: 'Pulsa & Data',
      category_slug: 'data',
      description: 'Top up pulsa reguler XL & paket internet Xtra Combo Flex (Tahap Pengembangan).',
      badge: 'TAHAP DEV',
      is_realtime: false,
      is_development: true,
      status_note: 'Non-Realtime / Tahap Pengembangan',
      price: 10000,
      image: '/gambar/logo/XL-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'xl10', name: 'Pulsa XL 10.000', price: 10750, original_price: 12000 },
        { code_variant: 'xl25', name: 'Pulsa XL 25.000', price: 25500, original_price: 27000 },
        { code_variant: 'xl50', name: 'Pulsa XL 50.000', price: 50400, original_price: 52000 },
        { code_variant: 'xl_data_15gb', name: 'Xtra Combo Flex 15GB', price: 55000, original_price: 62000 }
      ]
    },
    {
      code: 'indosat',
      name: 'Indosat Ooredoo Hutchison',
      category: 'Pulsa & Data',
      category_slug: 'pulsa',
      description: 'Pulsa Im3 Indosat & Paket Freedom Internet (Tahap Pengembangan).',
      badge: 'TAHAP DEV',
      is_realtime: false,
      is_development: true,
      status_note: 'Non-Realtime / Tahap Pengembangan',
      price: 10000,
      image: '/gambar/logo/indosat-ooredoo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'isat10', name: 'Pulsa Indosat 10.000', price: 10700, original_price: 12000 },
        { code_variant: 'isat25', name: 'Pulsa Indosat 25.000', price: 25400, original_price: 27000 },
        { code_variant: 'isat_data_20gb', name: 'Freedom Internet 20GB', price: 62000, original_price: 70000 }
      ]
    },
    {
      code: 'tri',
      name: 'Tri Indonesia (3)',
      category: 'Pulsa & Data',
      category_slug: 'data',
      description: 'Pulsa Tri & Paket Kuota AlwaysOn / Happy (Tahap Pengembangan).',
      badge: 'TAHAP DEV',
      is_realtime: false,
      is_development: true,
      status_note: 'Non-Realtime / Tahap Pengembangan',
      price: 10000,
      image: '/gambar/logo/tri-logo.jpg',
      provider: 'easymall',
      variants: [
        { code_variant: 'tri10', name: 'Pulsa Tri 10.000', price: 10600, original_price: 12000 },
        { code_variant: 'tri25', name: 'Pulsa Tri 25.000', price: 25300, original_price: 27000 },
        { code_variant: 'tri_aon_9gb', name: 'Kuota AON 9GB Masa Aktif Panjang', price: 38000, original_price: 44000 }
      ]
    },
    {
      code: 'axis',
      name: 'Axis Bronet & OWSEM',
      category: 'Pulsa & Data',
      category_slug: 'data',
      description: 'Beli pulsa Axis & Paket Internet Bronet 24 Jam (Tahap Pengembangan).',
      badge: 'TAHAP DEV',
      is_realtime: false,
      is_development: true,
      status_note: 'Non-Realtime / Tahap Pengembangan',
      price: 10000,
      image: '/gambar/logo/axis-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'axis10', name: 'Pulsa Axis 10.000', price: 10700, original_price: 12000 },
        { code_variant: 'axis_bronet_12gb', name: 'Bronet 12GB 30 Hari', price: 44000, original_price: 50000 }
      ]
    },
    {
      code: 'smartfren',
      name: 'Smartfren Unlimited & Volume',
      category: 'Pulsa & Data',
      category_slug: 'data',
      description: 'Beli pulsa Smartfren & Kuota Unlimited Nonstop (Tahap Pengembangan).',
      badge: 'TAHAP DEV',
      is_realtime: false,
      is_development: true,
      status_note: 'Non-Realtime / Tahap Pengembangan',
      price: 10000,
      image: '/gambar/logo/smartfren-logo.jpeg',
      provider: 'easymall',
      variants: [
        { code_variant: 'sf10', name: 'Pulsa Smartfren 10.000', price: 10700, original_price: 12000 },
        { code_variant: 'sf_unlimited_30d', name: 'Smartfren Unlimited 30 Hari', price: 72000, original_price: 80000 }
      ]
    },

    // --- TOKEN PLN (NON-REALTIME / DEV) ---
    {
      code: 'pln-token',
      name: 'Token Listrik PLN Prabayar',
      category: 'Token PLN',
      category_slug: 'pln',
      description: 'Beli stroom token listrik PLN Prabayar (Tahap Pengembangan).',
      badge: 'TAHAP DEV',
      is_realtime: false,
      is_development: true,
      status_note: 'Non-Realtime / Tahap Pengembangan',
      price: 20000,
      image: '/gambar/logo/Logo_PLN.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'pln20', name: 'Token PLN Rp 20.000', price: 20500, original_price: 22000 },
        { code_variant: 'pln50', name: 'Token PLN Rp 50.000', price: 50500, original_price: 52000 },
        { code_variant: 'pln100', name: 'Token PLN Rp 100.000', price: 100500, original_price: 102000 },
        { code_variant: 'pln200', name: 'Token PLN Rp 200.000', price: 200500, original_price: 203000 },
        { code_variant: 'pln500', name: 'Token PLN Rp 500.000', price: 500500, original_price: 503000 }
      ]
    },

    // --- SSL & DOMAIN (MANUAL / DEV) ---
    {
      code: 'domain-ssl',
      name: 'SSL Certificate & Domain Registrar API',
      category: 'SSL & Domain',
      category_slug: 'ssl',
      description: 'Layanan pendaftaran domain .COM/.ID & Sertifikat SSL DV/OV (Proses Manual).',
      badge: 'MANUAL / DEV',
      is_realtime: false,
      is_development: true,
      status_note: 'Non-Realtime / Proses Manual',
      price: 125000,
      image: '/gambar/logo/domainname-api-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'com_domain', name: 'Domain .COM (1 Tahun)', price: 145000, original_price: 165000 },
        { code_variant: 'id_domain', name: 'Domain .ID (1 Tahun)', price: 210000, original_price: 240000 },
        { code_variant: 'ssl_positivessl', name: 'Sectigo PositiveSSL (1 Tahun)', price: 125000, original_price: 150000 },
        { code_variant: 'ssl_wildcard', name: 'Sectigo Wildcard SSL (1 Tahun)', price: 850000, original_price: 950000 }
      ]
    },

    // --- IP ACADEMY & COURSES ---
    {
      code: 'ip-academy',
      name: 'IP Academy Certified Course',
      category: 'Produk Digital',
      category_slug: 'digital',
      description: 'Sertifikasi & pelatihan digital kustomisasi software IT profesional.',
      badge: 'E-LEARNING',
      price: 150000,
      image: '/gambar/logo/ip_academy_logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'ip_basic', name: 'Modul Pelatihan Software Fundamental', price: 150000, original_price: 200000 },
        { code_variant: 'ip_pro', name: 'Sertifikasi Profesional & Mentoring 1-on-1', price: 499000, original_price: 650000 }
      ]
    }
  ];

  for (const item of additionalProducts) {
    if (!addedCodes.has(item.code)) {
      if (Array.isArray(item.variants) && item.variants.length > 0) {
        const validPrices = item.variants
          .map((v: any) => parseFloat(v.price || 0))
          .filter((p: number) => p > 0);
        if (validPrices.length > 0) {
          item.price = Math.min(...validPrices);
        }
      }
      finalProducts.push(item);
      addedCodes.add(item.code);
    }
  }

  const categories = [
    { slug: 'game', name: 'Game', icon: 'FaGamepad' },
    { slug: 'pulsa', name: 'Pulsa', icon: 'FaMobileAlt' },
    { slug: 'data', name: 'Data Internet', icon: 'FaWifi' },
    { slug: 'pln', name: 'Token PLN', icon: 'FaBolt' },
    { slug: 'digital', name: 'Streaming & Akun', icon: 'FaPlay' },
    { slug: 'productivity', name: 'Produktivitas & Desain', icon: 'FaLaptopCode' },
    { slug: 'music', name: 'Musik', icon: 'FaMusic' },
    { slug: 'ssl', name: 'SSL & Domain', icon: 'FaShieldAlt' }
  ];

  const responseData = {
    success: true,
    count: finalProducts.length,
    categories,
    products: finalProducts
  };

  productsCache = {
    time: now,
    data: responseData
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=60'
    }
  });
};
