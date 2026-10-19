/**
 * Genera el HTML de un comprobante de compra, listo para inyectar
 * en una ventana nueva y que el usuario imprima o guarde como PDF.
 *
 * Sin dependencias. Sin React. Solo HTML + CSS + texto plano.
 */

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPriceVes: number;
  totalVes: number;
  ivaType: 'included' | 'excluded' | 'exempt';
  ivaRate: number;
  ivaAmount: number;
}

export interface ReceiptIvaBreakdown {
  rate: number;
  base: number;
  amount: number;
}

export interface ReceiptData {
  // Número de comprobante
  receiptNumber: string;
  issuedAt: Date;

  // Emisor
  tenantName: string;
  tenantRif?: string | null;
  tenantAddress?: string | null;
  tenantPhone?: string | null;
  tenantEmail?: string | null;

  // Cliente
  customerName: string;
  customerIdType?: string | null;
  customerIdNumber?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;

  // Items
  items: ReceiptItem[];

  // Totales
  subtotalBaseVes: number;
  ivaBreakdown: ReceiptIvaBreakdown[];
  totalExemptVes: number;
  totalIvaVes: number;
  totalVes: number;
  totalUsd: number;
  exchangeRate: number;

  // Envío (opcional)
  deliveryCostVes?: number;
  deliveryCompany?: string | null;

  // Pago
  paymentMethod?: string | null;
  paymentReference?: string | null;
  bankSource?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatMoney = (n: number): string => {
  if (isNaN(n) || n === 0) return '0,00';
  return n.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const escapeHtml = (s: string): string => {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const getPaymentLabel = (method?: string | null): string => {
  if (!method) return 'No especificado';
  const labels: Record<string, string> = {
    pago_movil: 'Pago Móvil',
    zelle: 'Zelle',
    cash: 'Efectivo',
    pos: 'Punto de Venta',
    biopago: 'Biopago',
    binance: 'Binance Pay',
    transferencia: 'Transferencia Bancaria',
  };
  const normalized = method.toLowerCase().trim();
  return labels[normalized] || method.charAt(0).toUpperCase() + method.slice(1);
};

// ---------------------------------------------------------------------------
// Generador del HTML
// ---------------------------------------------------------------------------

export function generateReceiptHTML(data: ReceiptData): string {
  const {
    receiptNumber,
    issuedAt,
    tenantName,
    tenantRif,
    tenantAddress,
    tenantPhone,
    tenantEmail,
    customerName,
    customerIdType,
    customerIdNumber,
    customerPhone,
    customerEmail,
    customerAddress,
    items,
    subtotalBaseVes,
    ivaBreakdown,
    totalExemptVes,
    totalIvaVes,
    totalVes,
    totalUsd,
    exchangeRate,
    deliveryCostVes,
    deliveryCompany,
    paymentMethod,
    paymentReference,
    bankSource,
  } = data;

  const itemsRows = items
    .map((item) => {
      let ivaLabel = 'Exc';
      if (item.ivaType === 'included') ivaLabel = `${item.ivaRate}% Inc.`;
      else if (item.ivaType === 'excluded') ivaLabel = `${item.ivaRate}%`;

      return `
        <tr>
          <td class="col-cant">${item.quantity}</td>
          <td class="col-desc">${escapeHtml(item.name)}</td>
          <td class="col-money">Bs. ${formatMoney(item.unitPriceVes)}</td>
          <td class="col-iva">${ivaLabel}</td>
          <td class="col-money">Bs. ${formatMoney(item.totalVes)}</td>
        </tr>
      `;
    })
    .join('');

  const ivaRows = ivaBreakdown
    .filter((b) => b.amount > 0)
    .map(
      (b) => `
        <tr>
          <td class="totals-label">IVA ${b.rate}% (base Bs. ${formatMoney(b.base)}):</td>
          <td class="totals-value">Bs. ${formatMoney(b.amount)}</td>
        </tr>
      `
    )
    .join('');

  const exemptRow =
    totalExemptVes > 0
      ? `
        <tr>
          <td class="totals-label">Exento:</td>
          <td class="totals-value">Bs. ${formatMoney(totalExemptVes)}</td>
        </tr>
      `
      : '';

  const deliveryRow =
    deliveryCostVes && deliveryCostVes > 0
      ? `
        <tr>
          <td class="totals-label">Envío${deliveryCompany ? ` (${escapeHtml(deliveryCompany)})` : ''}:</td>
          <td class="totals-value">Bs. ${formatMoney(deliveryCostVes)}</td>
        </tr>
      `
      : '';

  const customerId =
    customerIdType && customerIdNumber
      ? `${escapeHtml(customerIdType)}-${escapeHtml(customerIdNumber)}`
      : customerIdNumber
        ? escapeHtml(customerIdNumber)
        : null;

  const now = new Date();
  const printFooterDate = formatDate(now);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(receiptNumber)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  @page {
    size: A4;
    margin: 15mm 15mm 15mm 15mm;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    line-height: 1.5;
    color: #000;
    background: #fff;
    padding: 20px;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
    background: #fff;
  }

  /* ============ HEADER (acciones, no se imprime) ============ */
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-bottom: 20px;
  }
  .actions button {
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    border: 1px solid #000;
    background: #fff;
    color: #000;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.15s, color 0.15s;
  }
  .actions button:hover {
    background: #000;
    color: #fff;
  }
  .actions button.primary {
    background: #000;
    color: #fff;
  }
  .actions button.primary:hover {
    background: #333;
    border-color: #333;
  }

  /* ============ EMISOR ============ */
  .issuer {
    text-align: right;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #000;
  }
  .issuer-name {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .issuer-line {
    font-size: 11px;
    line-height: 1.6;
    color: #222;
  }

  /* ============ TÍTULO DEL COMPROBANTE ============ */
  .doc-title {
    text-align: center;
    margin-bottom: 20px;
  }
  .doc-title h1 {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 2px;
    margin-bottom: 4px;
  }
  .doc-title .doc-number {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .doc-title .doc-date {
    font-size: 11px;
    color: #444;
  }

  /* ============ SECCIONES ============ */
  .section {
    margin-bottom: 18px;
  }
  .section-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #ccc;
  }
  .section-body {
    font-size: 11px;
    line-height: 1.7;
  }
  .field-row {
    display: flex;
    gap: 8px;
  }
  .field-row .field-label {
    font-weight: 600;
    min-width: 90px;
    color: #333;
  }
  .field-row .field-value {
    color: #000;
    flex: 1;
  }

  /* ============ TABLA DE ITEMS ============ */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 11px;
  }
  .items-table thead th {
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 6px;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
  }
  .items-table thead th.col-money,
  .items-table thead th.col-iva {
    text-align: right;
  }
  .items-table thead th.col-cant {
    width: 50px;
    text-align: center;
  }
  .items-table thead th.col-iva {
    width: 70px;
  }
  .items-table thead th.col-money {
    width: 110px;
  }
  .items-table tbody td {
    padding: 7px 6px;
    border-bottom: 1px solid #eee;
    vertical-align: top;
  }
  .items-table tbody td.col-cant {
    text-align: center;
  }
  .items-table tbody td.col-money {
    text-align: right;
    white-space: nowrap;
  }
  .items-table tbody td.col-iva {
    text-align: right;
    white-space: nowrap;
  }
  .items-table tbody td.col-desc {
    word-break: break-word;
  }

  /* ============ TOTALES ============ */
  .totals {
    margin-top: 16px;
    margin-left: auto;
    width: 100%;
    max-width: 380px;
  }
  .totals table {
    width: 100%;
    border-collapse: collapse;
  }
  .totals tr td {
    padding: 4px 0;
    font-size: 11px;
  }
  .totals-label {
    text-align: right;
    padding-right: 16px !important;
    color: #333;
  }
  .totals-value {
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .totals tr.grand-total td {
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    padding: 8px 0 !important;
    font-size: 14px;
    font-weight: 700;
  }
  .totals tr.grand-total .totals-label {
    text-align: right;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .totals .total-usd {
    text-align: right;
    font-size: 10px;
    color: #444;
    padding-top: 2px;
  }

  /* ============ PAGO ============ */
  .payment-block {
    margin-top: 20px;
    padding: 12px 14px;
    border: 1px solid #000;
    font-size: 11px;
    line-height: 1.7;
  }
  .payment-block .payment-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  /* ============ LEGAL ============ */
  .legal {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #ccc;
    font-size: 10px;
    color: #333;
    text-align: center;
    line-height: 1.6;
  }

  /* ============ FIRMAS ============ */
  .signatures {
    margin-top: 50px;
    display: flex;
    justify-content: space-between;
    gap: 40px;
  }
  .signature {
    flex: 1;
    text-align: center;
    font-size: 10px;
    color: #333;
  }
  .signature .line {
    border-top: 1px solid #000;
    margin-bottom: 6px;
    height: 40px;
  }

  /* ============ PIE DE IMPRESIÓN ============ */
  .print-footer {
    margin-top: 24px;
    padding-top: 8px;
    border-top: 1px solid #eee;
    font-size: 9px;
    color: #999;
    text-align: center;
  }

  /* ============ PRINT ============ */
  @media print {
    body { padding: 0; }
    .actions { display: none !important; }
    .container { max-width: none; }
    .print-footer { display: none; }
    .items-table thead { display: table-header-group; }
    .items-table tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="container">

  <!-- Acciones (no se imprimen) -->
  <div class="actions">
    <button class="primary" onclick="window.print()">Imprimir</button>
    <button onclick="window.close()">Cerrar</button>
  </div>

  <!-- Emisor -->
  <div class="issuer">
    <div class="issuer-name">${escapeHtml(tenantName || 'Mi Negocio')}</div>
    ${tenantRif ? `<div class="issuer-line">RIF: ${escapeHtml(tenantRif)}</div>` : ''}
    ${tenantAddress ? `<div class="issuer-line">${escapeHtml(tenantAddress)}</div>` : ''}
    ${tenantPhone ? `<div class="issuer-line">Tel: ${escapeHtml(tenantPhone)}</div>` : ''}
    ${tenantEmail ? `<div class="issuer-line">${escapeHtml(tenantEmail)}</div>` : ''}
  </div>

  <!-- Título del documento -->
  <div class="doc-title">
    <h1>COMPROBANTE DE COMPRA</h1>
    <div class="doc-number">N° ${escapeHtml(receiptNumber)}</div>
    <div class="doc-date">Fecha de emisión: ${formatDate(issuedAt)}</div>
  </div>

  <!-- Datos del cliente -->
  <div class="section">
    <div class="section-title">Datos del Cliente</div>
    <div class="section-body">
      <div class="field-row">
        <span class="field-label">Nombre:</span>
        <span class="field-value">${escapeHtml(customerName || 'Consumidor final')}</span>
      </div>
      ${customerId ? `<div class="field-row"><span class="field-label">Cédula/RIF:</span><span class="field-value">${customerId}</span></div>` : ''}
      ${customerPhone ? `<div class="field-row"><span class="field-label">Teléfono:</span><span class="field-value">${escapeHtml(customerPhone)}</span></div>` : ''}
      ${customerEmail ? `<div class="field-row"><span class="field-label">Email:</span><span class="field-value">${escapeHtml(customerEmail)}</span></div>` : ''}
      ${customerAddress ? `<div class="field-row"><span class="field-label">Dirección:</span><span class="field-value">${escapeHtml(customerAddress)}</span></div>` : ''}
    </div>
  </div>

  <!-- Detalle -->
  <div class="section">
    <div class="section-title">Detalle</div>
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-cant">Cant</th>
          <th class="col-desc">Descripción</th>
          <th class="col-money">P. Unit</th>
          <th class="col-iva">IVA</th>
          <th class="col-money">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>
  </div>

  <!-- Totales -->
  <div class="totals">
    <table>
      <tr>
        <td class="totals-label">Subtotal (base imponible):</td>
        <td class="totals-value">Bs. ${formatMoney(subtotalBaseVes)}</td>
      </tr>
      ${ivaRows}
      ${exemptRow}
      ${deliveryRow}
      <tr class="grand-total">
        <td class="totals-label">Total:</td>
        <td class="totals-value">Bs. ${formatMoney(totalVes)}</td>
      </tr>
      <tr>
        <td colspan="2" class="total-usd">(USD ${formatMoney(totalUsd)} — Tasa BCV: ${formatMoney(exchangeRate)})</td>
      </tr>
    </table>
  </div>

  <!-- Pago -->
  <div class="payment-block">
    <div class="payment-title">Método de Pago</div>
    <div>
      <strong>${escapeHtml(getPaymentLabel(paymentMethod))}</strong>
      ${paymentReference ? ` — Ref: ${escapeHtml(paymentReference)}` : ''}
    </div>
    ${bankSource ? `<div>Banco: ${escapeHtml(bankSource)}</div>` : ''}
    ${customerId ? `<div>Titular: ${customerId}</div>` : ''}
    ${customerPhone ? `<div>Teléfono: ${escapeHtml(customerPhone)}</div>` : ''}
  </div>

  <!-- Legal -->
  <div class="legal">
    Este documento no constituye factura fiscal. Solicite su factura fiscal.
  </div>

  <!-- Firmas -->
  <div class="signatures">
    <div class="signature">
      <div class="line"></div>
      Firma del cliente
    </div>
    <div class="signature">
      <div class="line"></div>
      Firma del comercio
    </div>
  </div>

  <!-- Pie de impresión (no se imprime) -->
  <div class="print-footer">
    Generado el ${printFooterDate}
  </div>

</div>
</body>
</html>`;
}