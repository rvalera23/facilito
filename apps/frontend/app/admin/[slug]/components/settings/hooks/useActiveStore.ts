'use client';

import { useState, useEffect } from 'react';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export function useActiveStore(brandConfig: any, setBrandConfig: React.Dispatch<React.SetStateAction<any>>) {
  const specificConfig = brandConfig?.specific_config || {};

  const isManuallyClosed = specificConfig?.is_manually_closed === true;
  const schedule = specificConfig?.schedule || {};
  const globalSchedule = specificConfig?.globalSchedule || { open: '08:00', close: '18:00' };

  const [scheduleMode, setScheduleMode] = useState<'preset' | 'custom'>(
    specificConfig?.scheduleMode || 'preset'
  );
  const [currentPreset, setCurrentPreset] = useState<string>(
    specificConfig?.currentPreset || 'weekdays'
  );

  useEffect(() => {
    if (specificConfig?.scheduleMode) {
      setScheduleMode(specificConfig.scheduleMode);
    }
    if (specificConfig?.currentPreset) {
      setCurrentPreset(specificConfig.currentPreset);
    }
  }, [specificConfig?.scheduleMode, specificConfig?.currentPreset]);

  const updateSpecificConfig = (newSpecificValues: any) => {
    setBrandConfig((prev: any) => ({
      ...prev,
      specific_config: {
        ...(prev?.specific_config || {}),
        ...newSpecificValues,
      },
    }));
  };

  const handleToggleManualClose = (checked: boolean) => {
    updateSpecificConfig({
      is_manually_closed: checked,
    });
  };

  const handleApplyPreset = (presetKey: string, customOpen?: string, customClose?: string) => {
    setCurrentPreset(presetKey);
    setScheduleMode('preset');

    const openTime = customOpen || globalSchedule.open;
    const closeTime = customClose || globalSchedule.close;

    let newSchedule: Record<string, any> = {};

    DAYS_OF_WEEK.forEach(({ key }) => {
      const isWeekend = key === 'saturday' || key === 'sunday';
      let closed = false;

      if (presetKey === 'weekdays') closed = isWeekend;
      if (presetKey === 'weekends') closed = !isWeekend;

      newSchedule[key] = {
        open: presetKey === '247' ? '00:00' : openTime,
        close: presetKey === '247' ? '23:59' : closeTime,
        closed: closed,
      };
    });

    updateSpecificConfig({
      scheduleMode: 'preset',
      currentPreset: presetKey,
      globalSchedule: { open: openTime, close: closeTime },
      schedule: newSchedule,
    });
  };

  const handleGlobalTimeChange = (field: 'open' | 'close', value: string) => {
    const updatedGlobal = { ...globalSchedule, [field]: value };
    handleApplyPreset(currentPreset, updatedGlobal.open, updatedGlobal.close);
  };

  const handleDayChange = (dayKey: string, field: string, value: any) => {
    setScheduleMode('custom');
    const currentDayConfig = schedule[dayKey] || { open: '08:00', close: '18:00', closed: false };
    
    const updatedSchedule = {
      ...schedule,
      [dayKey]: {
        ...currentDayConfig,
        [field]: value,
      },
    };

    updateSpecificConfig({
      scheduleMode: 'custom',
      schedule: updatedSchedule,
    });
  };

  const toggleScheduleMode = (mode: 'preset' | 'custom') => {
    setScheduleMode(mode);
    updateSpecificConfig({ scheduleMode: mode });
  };

  return {
    isManuallyClosed,
    schedule,
    globalSchedule,
    scheduleMode,
    currentPreset,
    daysOfWeek: DAYS_OF_WEEK,
    handleToggleManualClose,
    handleApplyPreset,
    handleGlobalTimeChange,
    handleDayChange,
    toggleScheduleMode,
  };
}