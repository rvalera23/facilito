export const getProductPrices = (product: any) => {
  if (!product) return { VES: 0, USD: 0, ivaType: 'excluded', ivaRate: 16 };

  // 🔥 Buscar en attributes.prices primero (más confiable)
  const attrs = product?.attributes || {};
  let pricesObj = attrs.prices || product?.prices || {};

  if (typeof pricesObj === 'string') {
    try {
      pricesObj = JSON.parse(pricesObj);
    } catch {
      pricesObj = {};
    }
  }

  // 🔥 Si pricesObj está vacío, intentar con product directamente
  if (!pricesObj || Object.keys(pricesObj).length === 0) {
    pricesObj = {};
  }

  const vesVal = Number(
    pricesObj?.VES ??
    pricesObj?.ves ??
    attrs.price_ves ??
    product?.price_ves ??
    product?.price ??
    0
  );

  const usdVal = Number(
    pricesObj?.USD ??
    pricesObj?.usd ??
    attrs.priceUsd ??
    attrs.usdReference ??
    product?.priceUsd ??
    product?.price_usd ??
    product?.usd ??
    product?.attributes?.prices?.USD ??
    0
  );

  // 🔥 IVA del producto
  const ivaType = product?.ivaType || attrs?.ivaType || 'excluded';
  const ivaRate = Number(product?.ivaRate || attrs?.ivaRate || 16);

  return {
    VES: !isNaN(vesVal) ? vesVal : 0,
    USD: !isNaN(usdVal) ? usdVal : 0,
    ivaType,
    ivaRate,
  };
};