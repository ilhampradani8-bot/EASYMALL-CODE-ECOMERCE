import type { APIRoute } from 'astro';

export const prerender = false;

// In-memory cache
let productsCache: { time: number; data: any } | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
      }
    });
  }

  const markupNominal = parseFloat(process.env.PRICE_MARKUP_NOMINAL || '0');
  const markupPercent = parseFloat(process.env.PRICE_MARKUP_PERCENT || '25');

  const koalaKey = process.env.KOALASTORE_API_KEY || 'kb_live_af0475f0cd12d8ff9ceb5b087a8977ef09303d9f';

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
      const koalaJson = await koalaRes.json();
      if (koalaJson && Array.isArray(koalaJson.data)) {
        for (const item of koalaJson.data) {
          const product = { ...item };
          if (Array.isArray(product.variants)) {
            product.variants = product.variants.map((v: any) => {
              const originalPrice = parseFloat(v.price || 0);
              const markedPrice = originalPrice + markupNominal + (originalPrice * markupPercent / 100);
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

  // 2. Add Complete Additional Product Catalog (Top Up Games, Pulsa, Data, PLN, SSL/Domain, IP Academy)
  const additionalProducts = [
    // Top Up Games
    {
      code: 'mlbb',
      name: 'Mobile Legends: Bang Bang',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up Diamond Mobile Legends tercepat 24 jam legal & aman.',
      badge: 'POPULER',
      price: 15000,
      image: '/gambar/logo/mobilelegend-logo.jpeg',
      provider: 'easymall',
      variants: [
        { code_variant: 'ml86', name: '86 Diamonds', price: 23000, original_price: 25000 },
        { code_variant: 'ml172', name: '172 Diamonds', price: 45000, original_price: 50000 },
        { code_variant: 'ml257', name: '257 Diamonds', price: 67000, original_price: 75000 },
        { code_variant: 'ml344', name: '344 Diamonds', price: 90000, original_price: 100000 },
        { code_variant: 'ml706', name: '706 Diamonds', price: 180000, original_price: 200000 },
        { code_variant: 'mlpass', name: 'Weekly Diamond Pass', price: 28500, original_price: 32000 }
      ]
    },
    {
      code: 'ff',
      name: 'Free Fire',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up Diamond Free Fire instant pengiriman 1 detik.',
      badge: 'INSTAN',
      price: 10000,
      image: '/gambar/logo/freefiree-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'ff140', name: '140 Diamonds', price: 19500, original_price: 22000 },
        { code_variant: 'ff355', name: '355 Diamonds', price: 48000, original_price: 55000 },
        { code_variant: 'ff720', name: '720 Diamonds', price: 95000, original_price: 110000 },
        { code_variant: 'ff1440', name: '1440 Diamonds', price: 190000, original_price: 215000 }
      ]
    },
    {
      code: 'valorant',
      name: 'Valorant Points',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Beli Valorant Points VP murah resmi Riot Games Indonesia.',
      badge: 'TERLARIS',
      price: 50000,
      image: '/gambar/logo/valorant-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'vp475', name: '475 VP', price: 55000, original_price: 60000 },
        { code_variant: 'vp1000', name: '1000 VP', price: 112000, original_price: 125000 },
        { code_variant: 'vp2050', name: '2050 VP', price: 220000, original_price: 240000 }
      ]
    },
    {
      code: 'codm',
      name: 'Call of Duty Mobile',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up CP Call of Duty Mobile CODM murah instan 24 Jam.',
      badge: 'INSTAN',
      price: 20000,
      image: '/gambar/logo/Call-of-Duty-Logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'cp153', name: '153 CP', price: 29000, original_price: 33000 },
        { code_variant: 'cp318', name: '318 CP', price: 58000, original_price: 65000 },
        { code_variant: 'cp800', name: '800 CP', price: 140000, original_price: 155000 }
      ]
    },
    {
      code: 'aov',
      name: 'Arena of Valor',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up Voucher AOV Arena of Valor resmi pengiriman instan.',
      price: 15000,
      image: '/gambar/logo/Arena_of_Valor_logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'aov40', name: '40 Voucher', price: 12000, original_price: 15000 },
        { code_variant: 'aov90', name: '90 Voucher', price: 24000, original_price: 28000 },
        { code_variant: 'aov230', name: '230 Voucher', price: 60000, original_price: 68000 }
      ]
    },
    {
      code: 'laplace',
      name: 'Laplace M',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up Spiral / Jade Laplace M murah aman bergaransi.',
      price: 25000,
      image: '/gambar/logo/laplace-game-logo.png',
      provider: 'easymall',
      variants: [
        { code_variant: 'lap60', name: '60 Spirals', price: 16000, original_price: 19000 },
        { code_variant: 'lap300', name: '300 Spirals', price: 78000, original_price: 88000 }
      ]
    },
    {
      code: 'sausageman',
      name: 'Sausage Man',
      category: 'Top Up Game',
      category_slug: 'game',
      description: 'Top up Candies Sausage Man instan pengiriman otomatis.',
      price: 15000,
      image: '/gambar/logo/sausageman-logo.jpeg',
      provider: 'easymall',
      variants: [
        { code_variant: 'sm60', name: '60 Candies', price: 16000, original_price: 19000 },
        { code_variant: 'sm316', name: '316 Candies', price: 79000, original_price: 89000 }
      ]
    },

    // Pulsa & Data Internet
    {
      code: 'telkomsel',
      name: 'Telkomsel Pulsa & Paket Data',
      category: 'Pulsa & Data',
      category_slug: 'pulsa',
      description: 'Isi pulsa reguler & kuota internet Telkomsel Koin / Orbit murah instan.',
      badge: 'OFFICIAL',
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
      description: 'Top up pulsa reguler XL & paket internet Xtra Combo Flex murah.',
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
      description: 'Pulsa Im3 Indosat & Paket Freedom Internet murah 24 jam.',
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
      description: 'Pulsa Tri & Paket Kuota AlwaysOn / Happy murah instan.',
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
      description: 'Beli pulsa Axis & Paket Internet Bronet 24 Jam terjangkau.',
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
      description: 'Beli pulsa Smartfren & Kuota Unlimited Nonstop super cepat.',
      price: 10000,
      image: '/gambar/logo/smartfren-logo.jpeg',
      provider: 'easymall',
      variants: [
        { code_variant: 'sf10', name: 'Pulsa Smartfren 10.000', price: 10700, original_price: 12000 },
        { code_variant: 'sf_unlimited_30d', name: 'Smartfren Unlimited 30 Hari', price: 72000, original_price: 80000 }
      ]
    },

    // Token PLN
    {
      code: 'pln-token',
      name: 'Token Listrik PLN PLN',
      category: 'Token PLN',
      category_slug: 'pln',
      description: 'Beli stroom token listrik PLN Prabayar murah instan 24 jam.',
      badge: 'OFFICIAL',
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

    // SSL & Domain Services
    {
      code: 'domain-ssl',
      name: 'SSL Certificate & Domain Registrar API',
      category: 'SSL & Domain',
      category_slug: 'ssl',
      description: 'Layanan pendaftaran domain .COM/.ID & Sertifikat SSL DV/OV murah terpercaya.',
      badge: 'TERPERCAYA',
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

    // IP Academy
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
    { slug: 'ssl', name: 'SSL & Domain', icon: 'FaGlobe' },
    { slug: 'digital', name: 'Produk Digital', icon: 'FaKey' },
    { slug: 'music', name: 'Music Streaming', icon: 'FaMusic' },
    { slug: 'productivity', name: 'Productivity Tools', icon: 'FaTools' }
  ];

  const responseData = {
    success: true,
    products: finalProducts,
    categories
  };

  productsCache = { time: now, data: responseData };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
    }
  });
};
