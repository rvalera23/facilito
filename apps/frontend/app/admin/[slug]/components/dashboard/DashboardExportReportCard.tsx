'use client';

import React, { forwardRef } from 'react';

// ============================================================
// 🔥 DASHBOARD EXPORT REPORT CARD — Reporte de ventas
// ============================================================
// Se renderiza oculto y se convierte en PNG con html-to-image.
// Formato: 1080x1350 (4:5, tipo post de Instagram)
// ============================================================

interface DashboardExportReportCardProps {
  data: {
    tenantName: string;
    tenantSlogan: string | null;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    isDarkBg: boolean;

    totalSalesVes: number;
    totalSalesUsd: number;
    totalOrdersCount: number;
    pendingOrdersCount: number;
    totalCustomersCount: number;
    averageTicketVes: number;
    averageTicketUsd: number;

    statusData: {
      pending?: number;
      confirmed?: number;
      completed?: number;
      cancelled?: number;
      noShow?: number;
    };

    // 🔥 NUEVO: resumen operativo
    deliverySummary?: {
      withShipping: number;
      withoutShipping: number;
    };
    topPaymentMethod?: {
      label: string;
      count: number;
    } | null;
    totalCreditVes?: number;
    totalCreditUsers?: number;

    topItems: Array<{
      name: string;
      value: number;
    }>;

    exchangeRate: number;

    labels: {
      ordersLabel: string;
      itemPlural: string;
      countLabel: string;
    };
  };
}

// ============================================================
// 🔥 HELPERS
// ============================================================
function formatNumber(num: number, decimals: number = 2): string {
  if (isNaN(num) || !isFinite(num)) return '0';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDate(): string {
  const d = new Date();
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

function withOpacity(hexColor: string, opacity: number): string {
  const clean = (hexColor || '#000000').replace('#', '');
  if (clean.length !== 6) return hexColor;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// 🔥 Tamaño de fuente dinámico para nombres largos
function nameSizeFor(name: string): number {
  const len = (name || '').length;
  if (len <= 18) return 38;
  if (len <= 30) return 32;
  if (len <= 45) return 26;
  if (len <= 60) return 22;
  return 18;
}

// ============================================================
// 🔥 COMPONENTE
// ============================================================
const DashboardExportReportCard = forwardRef<
  HTMLDivElement,
  DashboardExportReportCardProps
>(function DashboardExportReportCard({ data }, ref) {
  const bgColor = data.isDarkBg ? '#0b0f19' : '#ffffff';
  const cardBorder = data.isDarkBg
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.06)';
  const cardBg = data.isDarkBg
    ? 'rgba(255,255,255,0.03)'
    : 'rgba(0,0,0,0.02)';

  const statusColors: Record<string, string> = {
    completed: '#22c55e',
    confirmed: '#3b82f6',
    pending: '#f59e0b',
    cancelled: '#ef4444',
    noShow: '#94a3b8',
  };

  const statusLabels: Record<string, string> = {
    completed: 'Completados',
    confirmed: 'Confirmados',
    pending: 'Pendientes',
    cancelled: 'Cancelados',
    noShow: 'No asistió',
  };

  const totalStatus =
    Object.values(data.statusData).reduce((a, b) => a + (b || 0), 0) || 1;

  const topMax = Math.max(...data.topItems.map((t) => t.value), 1);

  const nameFontSize = nameSizeFor(data.tenantName);

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1350,
        backgroundColor: bgColor,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        color: data.textColor,
        padding: 60,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Decoración: círculos difusos */}
      <div
        style={{
          position: 'absolute',
          top: -180,
          right: -180,
          width: 640,
          height: 640,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withOpacity(data.primaryColor, 0.22)} 0%, ${withOpacity(data.primaryColor, 0)} 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -180,
          left: -180,
          width: 540,
          height: 540,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withOpacity(data.primaryColor, 0.14)} 0%, ${withOpacity(data.primaryColor, 0)} 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ============================================================ */}
      {/* HEADER: LOGO + NOMBRE */}
      {/* ============================================================ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          marginBottom: 32,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: data.logoUrl
              ? 'transparent'
              : data.primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {data.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={data.logoUrl}
              alt={data.tenantName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              crossOrigin="anonymous"
            />
          ) : (
            <span style={{ color: '#ffffff', fontSize: 40, fontWeight: 900 }}>
              {(data.tenantName || 'T')[0].toUpperCase()}
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: nameFontSize,
              fontWeight: 900,
              color: data.textColor,
              lineHeight: 1.15,
              letterSpacing: '-0.5px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {data.tenantName || 'Mi Negocio'}
          </div>
          {data.tenantSlogan && (
            <div
              style={{
                fontSize: 15,
                color: withOpacity(data.textColor, 0.6),
                marginTop: 4,
                lineHeight: 1.3,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {data.tenantSlogan}
            </div>
          )}
        </div>
      </div>

      {/* Divisor */}
      <div
        style={{
          height: 1,
          backgroundColor: withOpacity(data.textColor, 0.1),
          marginBottom: 28,
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* ============================================================ */}
      {/* TÍTULO: REPORTE DE VENTAS + FECHA */}
      {/* ============================================================ */}
      <div style={{ marginBottom: 32, position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: data.primaryColor,
            letterSpacing: '1.5px',
            marginBottom: 6,
          }}
        >
          REPORTE DE VENTAS
        </div>
        <div
          style={{
            fontSize: 14,
            color: withOpacity(data.textColor, 0.6),
          }}
        >
          {formatDate()}
        </div>
      </div>

      {/* ============================================================ */}
      {/* KPIs 2x2 */}
      {/* ============================================================ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 28,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {[
          {
            label: 'VENTAS TOTALES',
            value: `Bs. ${formatNumber(data.totalSalesVes)}`,
            secondary: `$${formatNumber(data.totalSalesUsd)} USD`,
          },
          {
            label: data.labels.ordersLabel.toUpperCase(),
            value: `${data.totalOrdersCount}`,
            secondary: `${data.pendingOrdersCount} pendientes`,
          },
          {
            label: 'CLIENTES',
            value: `${data.totalCustomersCount}`,
            secondary: 'clientes únicos',
          },
          {
            label: 'TICKET PROMEDIO',
            value: `Bs. ${formatNumber(data.averageTicketVes)}`,
            secondary: `$${formatNumber(data.averageTicketUsd)} USD`,
          },
        ].map((kpi, index) => (
          <div
            key={index}
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 18,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: withOpacity(data.textColor, 0.55),
                letterSpacing: '1px',
                marginBottom: 6,
              }}
            >
              {kpi.label}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: data.primaryColor,
                lineHeight: 1.1,
                letterSpacing: '-0.5px',
              }}
            >
              {kpi.value}
            </div>
            <div
              style={{
                fontSize: 12,
                color: withOpacity(data.textColor, 0.65),
                marginTop: 2,
              }}
            >
              {kpi.secondary}
            </div>
          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* RESUMEN OPERATIVO */}
      {/* ============================================================ */}
      {(data.deliverySummary ||
        data.topPaymentMethod ||
        (data.totalCreditVes && data.totalCreditVes > 0)) && (
        <div
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 18,
            padding: '18px 22px',
            marginBottom: 28,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: withOpacity(data.textColor, 0.55),
              letterSpacing: '1.5px',
              marginBottom: 14,
            }}
          >
            RESUMEN OPERATIVO
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 16,
            }}
          >
            {data.deliverySummary && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: withOpacity(data.textColor, 0.5),
                    marginBottom: 4,
                  }}
                >
                  Envíos
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: data.textColor,
                    lineHeight: 1.3,
                  }}
                >
                  {data.deliverySummary.withShipping} con envío
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: withOpacity(data.textColor, 0.6),
                    marginTop: 2,
                  }}
                >
                  {data.deliverySummary.withoutShipping} sin envío
                </div>
              </div>
            )}

            {data.topPaymentMethod && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: withOpacity(data.textColor, 0.5),
                    marginBottom: 4,
                  }}
                >
                  Método más usado
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: data.textColor,
                    lineHeight: 1.3,
                  }}
                >
                  {data.topPaymentMethod.label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: withOpacity(data.textColor, 0.6),
                    marginTop: 2,
                  }}
                >
                  {data.topPaymentMethod.count} uso
                  {data.topPaymentMethod.count === 1 ? '' : 's'}
                </div>
              </div>
            )}

            {data.totalCreditVes && data.totalCreditVes > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: withOpacity(data.textColor, 0.5),
                    marginBottom: 4,
                  }}
                >
                  Saldos a favor
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: data.primaryColor,
                    lineHeight: 1.3,
                  }}
                >
                  Bs. {formatNumber(data.totalCreditVes)}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: withOpacity(data.textColor, 0.6),
                    marginTop: 2,
                  }}
                >
                  {data.totalCreditUsers || 0} cliente
                  {data.totalCreditUsers === 1 ? '' : 's'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DISTRIBUCIÓN COMPACTA */}
      {/* ============================================================ */}
      <div style={{ marginBottom: 28, position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: data.textColor,
            marginBottom: 14,
            letterSpacing: '0.5px',
          }}
        >
          DISTRIBUCIÓN
        </div>

        <div
          style={{
            display: 'flex',
            height: 16,
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: cardBg,
            marginBottom: 14,
          }}
        >
          {(Object.keys(statusColors) as Array<keyof typeof statusColors>).map(
            (key) => {
              const value =
                data.statusData[key as keyof typeof data.statusData] || 0;
              if (value === 0) return null;
              const widthPercent = (value / totalStatus) * 100;
              return (
                <div
                  key={key}
                  style={{
                    width: `${widthPercent}%`,
                    height: '100%',
                    backgroundColor: statusColors[key],
                  }}
                />
              );
            },
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22 }}>
          {(Object.keys(statusColors) as Array<keyof typeof statusColors>).map(
            (key) => {
              const value =
                data.statusData[key as keyof typeof data.statusData] || 0;
              if (value === 0) return null;
              return (
                <div
                  key={key}
                  style={{ display: 'flex', alignItems: 'center', gap: 7 }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: statusColors[key],
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: withOpacity(data.textColor, 0.75),
                    }}
                  >
                    {statusLabels[key]} ({value})
                  </span>
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TOP ITEMS */}
      {/* ============================================================ */}
      {data.topItems.length > 0 && (
        <div style={{ marginBottom: 24, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: data.textColor,
              marginBottom: 16,
              letterSpacing: '0.5px',
            }}
          >
            {data.labels.itemPlural.toUpperCase()} MÁS VENDIDOS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.topItems.slice(0, 3).map((item, index) => {
              const widthPercent = (item.value / topMax) * 100;
              const nameText =
                item.name.length > 40
                  ? item.name.substring(0, 37) + '...'
                  : item.name;

              return (
                <div
                  key={index}
                  style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 30,
                      borderRadius: 10,
                      backgroundColor: withOpacity(data.primaryColor, 0.15),
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${Math.max(widthPercent, 25)}%`,
                        backgroundColor: data.primaryColor,
                        borderRadius: 10,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 12,
                        paddingRight: 12,
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {index + 1}. {nameText}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: withOpacity(data.textColor, 0.7),
                      minWidth: 80,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {item.value} {data.labels.countLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer flexible para empujar el footer abajo */}
      <div style={{ flex: 1, minHeight: 12 }} />

      {/* ============================================================ */}
      {/* FOOTER */}
      {/* ============================================================ */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            height: 1,
            backgroundColor: withOpacity(data.textColor, 0.1),
            marginBottom: 18,
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: withOpacity(data.textColor, 0.6),
                marginBottom: 3,
              }}
            >
              Tasa BCV del día:
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: data.primaryColor,
              }}
            >
              1 USD = Bs. {formatNumber(data.exchangeRate)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: withOpacity(data.textColor, 0.5),
              }}
            >
              Hecho con facilitó
            </div>
            <div
              style={{
                fontSize: 11,
                color: withOpacity(data.textColor, 0.3),
                marginTop: 2,
              }}
            >
              facilito.app
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

DashboardExportReportCard.displayName = 'DashboardExportReportCard';

export default DashboardExportReportCard;