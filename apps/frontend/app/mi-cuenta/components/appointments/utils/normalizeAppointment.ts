// utils/normalizeAppointment.ts
import { Appointment } from '../AppointmentsTab';

export const normalizeAppointment = (raw: any, tenantId?: string): Appointment => {
  const serviceData = raw.service || {};
  const servicePrice = serviceData.price || null;
  
  let metadataPrices: any = {};
  try {
    if (serviceData.metadata) {
      metadataPrices = typeof serviceData.metadata === 'string' 
        ? JSON.parse(serviceData.metadata) 
        : serviceData.metadata;
    }
    if (metadataPrices?.prices) {
      metadataPrices = metadataPrices.prices;
    }
  } catch (e) {
    metadataPrices = {};
  }
  
  const priceVes = servicePrice || metadataPrices?.VES || metadataPrices?.ves || null;
  const priceUsd = metadataPrices?.USD || metadataPrices?.usd || null;

  return {
    id: raw.id || raw._id,
    serviceName: serviceData.name || raw.serviceName || raw.service_name || 'Servicio',
    customerName: raw.customername || raw.customerName || raw.clientName || 'Cliente',
    customerPhone: raw.customerphone || raw.customerPhone || raw.clientPhone || '',
    customerEmail: raw.customeremail || raw.customerEmail || raw.clientEmail || '',
    bookingDate: raw.bookingdate || raw.bookingDate || raw.date || raw.appointmentDate || '',
    startTime: raw.starttime || raw.startTime || raw.time || raw.appointmentTime || '',
    endTime: raw.endtime || raw.endTime || raw.end_time || '',
    durationMinutes: Number(raw.durationminutes || raw.durationMinutes || raw.duration || 60),
    status: raw.status || 'pending',
    notes: raw.notes || raw.note || raw.comments || '',
    professional: raw.professionalid || raw.professionalId || raw.professional_id || raw.professional || null,
    professionalName: raw.professionalName || raw.professional_name || raw.staffName || null,
    service: {
      id: raw.serviceid || raw.serviceId || raw.service_id || serviceData.id,
      name: serviceData.name || raw.serviceName || raw.service_name || 'Servicio'
    },
    createdAt: raw.createdat || raw.createdAt || raw.created_at || raw.bookingdate || new Date().toISOString(),
    tenantId: raw.tenantid || raw.tenantId || raw.tenant_id || tenantId || '',
    priceVes: priceVes,
    priceUsd: priceUsd,
    tenantName: raw.tenantName || raw.tenant_name || null,
    tenantSlug: raw.tenantSlug || raw.tenant_slug || null,
    coverImage: raw.coverimage || raw.coverImage || serviceData.coverimage || serviceData.coverImage || null,
  };
};