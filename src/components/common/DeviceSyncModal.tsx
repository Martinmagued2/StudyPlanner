import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { getShareableSyncUrl } from '../../services/cloudSync';
import {
  Smartphone,
  Cloud,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  X,
  Laptop,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const DeviceSyncModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const {
    cloudSyncId,
    cloudSyncStatus,
    lastSyncedAt,
    saveToCloud,
    loadFromCloud,
    user
  } = useApp();

  const [inputCode, setInputCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<{ msg: string; error?: boolean } | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const effectiveSyncId = cloudSyncId || localStorage.getItem('nook_cloud_sync_id') || 'nook_' + (user?.id ? user.id.replace(/[^a-zA-Z0-9]/g, '') : 'sync');
  const syncUrl = getShareableSyncUrl(effectiveSyncId);

  // Auto-sync on modal open in the background without blocking the UI
  useEffect(() => {
    if (isOpen) {
      handleManualSyncNow();
    }
  }, [isOpen]);

  // Generate 100% offline & instantaneous QR Code data URL immediately
  useEffect(() => {
    let isCurrent = true;
    QRCode.toDataURL(syncUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => {
        if (isCurrent) setQrCodeDataUrl(url);
      })
      .catch(err => {
        console.warn('Local QRCode generator fallback:', err);
        if (isCurrent) {
          setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(syncUrl)}`);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [syncUrl]);

  const handleCopyLink = async () => {
    if (!syncUrl) return;
    try {
      await navigator.clipboard.writeText(syncUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyCode = async () => {
    if (!effectiveSyncId) return;
    try {
      await navigator.clipboard.writeText(effectiveSyncId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleManualSyncNow = async () => {
    setIsManualSyncing(true);
    setRestoreStatus(null);
    try {
      await saveToCloud();
      setRestoreStatus({ msg: 'Workspace synced to cloud successfully!' });
      setTimeout(() => setRestoreStatus(null), 3000);
    } catch (err: any) {
      setRestoreStatus({ msg: err.message || 'Sync failed. Please check network.', error: true });
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleRestoreFromCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setIsManualSyncing(true);
    setRestoreStatus(null);
    try {
      const ok = await loadFromCloud(inputCode.trim());
      if (ok) {
        setRestoreStatus({ msg: 'Workspace successfully loaded and connected to cloud!' });
        setInputCode('');
        setTimeout(() => {
          setRestoreStatus(null);
          onClose();
        }, 1500);
      } else {
        setRestoreStatus({ msg: 'Could not restore workspace with this code.', error: true });
      }
    } catch (err: any) {
      setRestoreStatus({ msg: err.message || 'Failed to fetch cloud workspace.', error: true });
    } finally {
      setIsManualSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Sync Between Phone & Laptop
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Seamless real-time workspace access across all your devices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {/* Status banner */}
          {restoreStatus && (
            <div
              className={`p-3 rounded-lg border flex items-center gap-2 ${
                restoreStatus.error
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
              }`}
            >
              {restoreStatus.error ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span className="font-medium text-xs">{restoreStatus.msg}</span>
            </div>
          )}

          {/* Sync Status Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>Cloud Sync: Active & Connected</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lastSyncedAt
                    ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Auto-syncs changes to cloud'}
                </div>
              </div>
            </div>

            <button
              onClick={handleManualSyncNow}
              disabled={isManualSyncing}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
              <span>{isManualSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {/* Option 1: Scan QR Code or Open Link */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                Option 1: Open on Your Phone (Quickest)
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                Instant setup
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center gap-4">
              {/* QR Code Container - Always rendered with offline QR code or immediate fast fallback */}
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 flex flex-col items-center justify-center min-w-[136px] min-h-[136px]">
                <img
                  src={
                    qrCodeDataUrl ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(syncUrl)}`
                  }
                  alt="Scan with phone camera"
                  className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded"
                />
                <span className="text-[10px] text-slate-500 font-mono mt-1 font-medium">
                  Scan with camera
                </span>
              </div>

              {/* Instructions & Link */}
              <div className="flex-1 space-y-2.5 text-left w-full">
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Open your phone camera and point it at the QR code, or copy the direct link to open in your phone browser:
                </p>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={syncUrl}
                    className="flex-1 px-2.5 py-1.5 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md select-all text-slate-700 dark:text-slate-300 overflow-hidden text-ellipsis"
                  />
                  <button
                    onClick={handleCopyLink}
                    disabled={!syncUrl}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                  >
                    {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  {syncUrl && (
                    <a
                      href={syncUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Open link in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Sync Code:</span>
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-semibold text-slate-800 dark:text-slate-200 select-all">
                    {effectiveSyncId}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 text-[10px]"
                  >
                    {copiedCode ? 'Copied code!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: Enter Sync Code manually */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              Option 2: Connect via Sync Code
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Already have a Sync Code from your other device? Enter it below to sync everything:
            </p>

            <form onSubmit={handleRestoreFromCode} className="flex gap-2">
              <input
                type="text"
                placeholder="Paste Sync Code or ID..."
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                type="submit"
                disabled={!inputCode.trim() || isManualSyncing}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
              >
                <span>Connect & Sync</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Laptop className="w-3.5 h-3.5" />
            <span>Laptop</span>
            <span>⇄</span>
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phone</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
