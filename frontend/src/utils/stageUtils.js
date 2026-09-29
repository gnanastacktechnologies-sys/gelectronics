/**
 * Utility helper functions for BOM Stages styling & colors
 */

export const DEFAULT_STAGES = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'];

export const getStageBadgeStyle = (stageStr = 'Stage 1') => {
  const normalized = (stageStr || '').trim().toLowerCase();

  if (normalized.includes('stage 1') || normalized === '1') {
    return 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/10';
  } else if (normalized.includes('stage 2') || normalized === '2') {
    return 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-sm shadow-purple-500/10';
  } else if (normalized.includes('stage 3') || normalized === '3') {
    return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10';
  } else if (normalized.includes('stage 4') || normalized === '4') {
    return 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10';
  } else if (normalized.includes('stage 5') || normalized === '5') {
    return 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-sm shadow-rose-500/10';
  } else {
    return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10';
  }
};

export const getStagePillColor = (stageStr = 'Stage 1') => {
  const normalized = (stageStr || '').trim().toLowerCase();

  if (normalized.includes('stage 1') || normalized === '1') {
    return {
      active: 'bg-indigo-500 text-slate-950 border-indigo-400 font-black',
      inactive: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/60',
    };
  } else if (normalized.includes('stage 2') || normalized === '2') {
    return {
      active: 'bg-purple-500 text-slate-950 border-purple-400 font-black',
      inactive: 'bg-purple-950/40 text-purple-300 border-purple-500/30 hover:bg-purple-900/60',
    };
  } else if (normalized.includes('stage 3') || normalized === '3') {
    return {
      active: 'bg-emerald-500 text-slate-950 border-emerald-400 font-black',
      inactive: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60',
    };
  } else if (normalized.includes('stage 4') || normalized === '4') {
    return {
      active: 'bg-amber-500 text-slate-950 border-amber-400 font-black',
      inactive: 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/60',
    };
  } else if (normalized.includes('stage 5') || normalized === '5') {
    return {
      active: 'bg-rose-500 text-slate-950 border-rose-400 font-black',
      inactive: 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/60',
    };
  } else {
    return {
      active: 'bg-cyan-500 text-slate-950 border-cyan-400 font-black',
      inactive: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30 hover:bg-cyan-900/60',
    };
  }
};
