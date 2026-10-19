// utils/currency.ts

export const formatPrice = (num: number | string): string => {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value) || value === 0) return '0,00';
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const getOrderTotalVes = (order: any): number => {
  if (order.totalAmountVes) {
    return Number(order.totalAmountVes);
  }

  if (order.items && Array.isArray(order.items)) {
    let totalVes = 0;
    for (const item of order.items) {
      const quantity = Number(item.quantity || 1);
      let priceVes = 0;
      
      if (item.priceVes) {
        priceVes = Number(item.priceVes);
      } else if (item.prices?.VES) {
        priceVes = Number(item.prices.VES);
      } else if (item.price) {
        priceVes = Number(item.price);
      }
      
      totalVes += priceVes * quantity;
    }
    return totalVes;
  }

  return 0;
};

export const getOrderCurrencies = (order: any) => {
  const totalVes = getOrderTotalVes(order);
  const totalUsd = Number(order.totalAmount || 0);
  return {
    bs: formatPrice(totalVes),
    usd: totalUsd.toFixed(2)
  };
};