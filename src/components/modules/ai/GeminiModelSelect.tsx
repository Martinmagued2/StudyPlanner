import React, { useState } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { GEMINI_MODEL_OPTIONS } from '../../../services/fileAiService';

interface GeminiModelSelectProps {
  compact?: boolean;
  showRefresh?: boolean;
  className?: string;
}

export const GeminiModelSelect: React.FC<GeminiModelSelectProps> = ({
  compact = false,
  showRefresh = true,
  className = ''
}) => {
  const {
    selectedGeminiModel,
    setSelectedGeminiModel,
    availableGeminiModels,
    refreshAvailableGeminiModels
  } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const presetIds = new Set(GEMINI_MODEL_OPTIONS.map(o => o.id));
  const extraLiveModels = availableGeminiModels.filter(m => !presetIds.has(m.id));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAvailableGeminiModels();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="relative flex items-center flex-1 min-w-0">
        <Cpu className="w-3 h-3 text-blue-600 dark:text-blue-400 absolute left-2 pointer-events-none" />
        <select
          value={selectedGeminiModel}
          onChange={e => setSelectedGeminiModel(e.target.value)}
          className={`w-full pl-6 pr-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 truncate ${
            compact ? 'py-1 text-[11px]' : 'py-1.5 text-xs'
          }`}
          title="Choose active Gemini AI model across StudyPlanner"
        >
          <optgroup label="Recommended Models">
            {GEMINI_MODEL_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </optgroup>
          {extraLiveModels.length > 0 && (
            <optgroup label="Detected Live on Your Key">
              {extraLiveModels.map(m => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.id})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {showRefresh && (
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors shrink-0 ${
            compact ? 'p-1' : 'p-1.5'
          }`}
          title="Fetch live Gemini models available on your API key"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      )}
    </div>
  );
};
