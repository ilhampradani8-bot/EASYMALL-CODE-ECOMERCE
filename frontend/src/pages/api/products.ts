import type { APIRoute } from 'astro';

export const prerender = false;

// Simple in-memory cache for Vercel serverless instance
let productsCache: { time: number; data: any } | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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
  const miracleKey = process.env.MIRACLE_GAMING_API_KEY || '';

  const finalProducts: any[] = [];

  // 1. Fetch from KoalaStore
  try {
    const koalaRes = await fetch('https://koalastore.digital/api/v1/products', {
      headers: {
        'X-API-KEY': koalaKey
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

          const basePrice = product.variants && product.variants.length > 0 ? product.variants[0].price : 0;
          product.price = basePrice;
          product.provider = 'koalastore';

          let slug = 'digital';
          if (product.category) {
            const catLower = String(product.category).toLowerCase();
            if (catLower.includes('music')) slug = 'music';
            else if (catLower.includes('productivity')) slug = 'productivity';
            else if (catLower.includes('game')) slug = 'game';
          }
          product.category_slug = slug;
          finalProducts.push(product);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching KoalaStore products:', err);
  }

  // 2. Fetch from Miracle Gaming
  if (miracleKey) {
    try {
      const miracleRes = await fetch('https://api.miraclegaming.store/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: miracleKey })
      });
      if (miracleRes.ok) {
        const miracleJson = await miracleRes.json();
        if (miracleJson && Array.isArray(miracleJson.data)) {
          for (const item of miracleJson.data.slice(0, 300)) {
            const basePrice = parseFloat(item.harga || 0);
            const finalPrice = Math.round(basePrice + markupNominal + (basePrice * markupPercent / 100));
            const code = item.id || item.code;
            const name = item.nama_layanan || item.name;
            const category = item.kategori || 'Game';

            finalProducts.push({
              code: String(code),
              name: String(name),
              category: String(category),
              category_slug: 'game',
              price: finalPrice,
              provider: 'miraclegaming',
              variants: [
                {
                  code_variant: String(code),
                  name: String(name),
                  price: finalPrice,
                  original_price: basePrice
                }
              ]
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching Miracle Gaming products:', err);
    }
  }

  // 3. Fallback categories
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
