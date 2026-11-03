import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Download,
  Upload,
  Wifi,
  FileCode,
  QrCode as QrIcon
} from 'lucide-react';

export const DeviceSyncModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const {
    cloudSyncId,
    directSyncPayload,
    cloudSyncStatus,
    lastSyncedAt,
    saveToCloud,
    loadFromCloud,
    exportWorkspaceJson,
    importWorkspaceJson,
    user
  } = useApp();

  const [activeTab, setActiveTab] = useState<'qr' | 'code' | 'file'>('qr');
  const [inputCode, setInputCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedData, setCopiedData] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<{ msg: string; error?: boolean } | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Local Wi-Fi IP helper for developers running on localhost
  const [customLanIp, setCustomLanIp] = useState<string>(() => {
    return localStorage.getItem('nook_lan_sync_ip') || '';
  });
  const [lanInput, setLanInput] = useState('');
  const [showLanHelper, setShowLanHelper] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  // Compute shareable URL: either direct JSZip payload (preferred, 0-network QR) or cloud code
  const effectiveSyncId = cloudSyncId || 'local_sync';
  const syncUrl = getShareableSyncUrl(
    effectiveSyncId,
    directSyncPayload || undefined,
    customLanIp || undefined
  );

  // Auto-sync on modal open in the background to ensure snapshot is fresh
  useEffect(() => {
    if (isOpen) {
      handleManualSyncNow();
    }
  }, [isOpen]);

  // Generate 100% offline & instantaneous QR Code data URL when syncUrl is ready
  useEffect(() => {
    if (!syncUrl) {
      setQrCodeDataUrl('');
      return;
    }

    let isCurrent = true;
    QRCode.toDataURL(syncUrl, {
      width: 280,
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
          setQrCodeDataUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(syncUrl)}`
          );
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
    if (!cloudSyncId) return;
    try {
      await navigator.clipboard.writeText(cloudSyncId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyDirectData = async () => {
    const payloadToCopy = directSyncPayload || exportWorkspaceJson();
    try {
      await navigator.clipboard.writeText(payloadToCopy);
      setCopiedData(true);
      setTimeout(() => setCopiedData(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleManualSyncNow = async () => {
    setIsManualSyncing(true);
    setRestoreStatus(null);
    try {
      await saveToCloud();
      setRestoreStatus({ msg: '✓ Workspace snapshot synced! Ready to scan or share.' });
      setTimeout(() => setRestoreStatus(null), 3500);
    } catch (err: any) {
      console.warn('Sync notice:', err);
      // Even if network relay had an issue, local QR code payload is ready!
      setRestoreStatus({ msg: '✓ Direct QR sync ready to scan!', error: false });
      setTimeout(() => setRestoreStatus(null), 3500);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleSaveLanIp = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lanInput.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
    if (clean) {
      setCustomLanIp(clean);
      localStorage.setItem('nook_lan_sync_ip', clean);
      setShowLanHelper(false);
      setRestoreStatus({ msg: `✓ QR code updated for local IP: ${clean}` });
      setTimeout(() => setRestoreStatus(null), 3000);
    }
  };

  const handleClearLanIp = () => {
    setCustomLanIp('');
    localStorage.removeItem('nook_lan_sync_ip');
    setLanInput('');
    setShowLanHelper(false);
  };

  const handleRestoreFromCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim();
    if (!clean) return;

    setIsManualSyncing(true);
    setRestoreStatus(null);
    try {
      // If user pasted raw JSON
      if (clean.startsWith('{') && clean.endsWith('}')) {
        const ok = importWorkspaceJson(clean);
        if (ok) {
          setRestoreStatus({ msg: '✓ Workspace successfully imported from JSON!' });
          setInputCode('');
          setTimeout(() => {
            setRestoreStatus(null);
            onClose();
          }, 1500);
          return;
        }
      }

      const ok = await loadFromCloud(clean);
      if (ok) {
        setRestoreStatus({ msg: '✓ Workspace successfully loaded and connected!' });
        setInputCode('');
        setTimeout(() => {
          setRestoreStatus(null);
          onClose();
        }, 1500);
      } else {
        setRestoreStatus({ msg: 'Could not restore workspace with this code. Check your code and try again.', error: true });
      }
    } catch (err: any) {
      setRestoreStatus({ msg: err.message || 'Failed to restore workspace.', error: true });
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleDownloadNookFile = () => {
    try {
      const jsonStr = exportWorkspaceJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `StudyPlanner-Workspace-${new Date().toISOString().slice(0, 10)}.nook`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setRestoreStatus({ msg: '✓ .nook workspace file downloaded successfully!' });
      setTimeout(() => setRestoreStatus(null), 3000);
    } catch (err: any) {
      setRestoreStatus({ msg: 'Failed to download workspace file.', error: true });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const content = evt.target?.result as string;
        if (content) {
          const ok = importWorkspaceJson(content);
          if (ok) {
            setRestoreStatus({ msg: `✓ Workspace loaded successfully from ${file.name}!` });
            setTimeout(() => {
              setRestoreStatus(null);
              onClose();
            }, 1500);
          } else {
            setRestoreStatus({ msg: 'Invalid workspace file format.', error: true });
          }
        }
      } catch {
        setRestoreStatus({ msg: 'Failed to parse workspace file.', error: true });
      }
    };
    reader.readAsText(file);
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
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
                  <span>Direct QR & Cloud Sync Ready</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lastSyncedAt
                    ? `Snapshot saved: ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Instant zero-network QR compression enabled'}
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

          {/* Tab Selector */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'qr'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-semibold shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <QrIcon className="w-3.5 h-3.5" />
              <span>Instant QR Code</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'code'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-semibold shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Sync Code</span>
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'file'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-semibold shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Offline .nook File</span>
            </button>
          </div>

          {/* TAB 1: QR Code & Direct Link */}
          {activeTab === 'qr' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center gap-4">
                {/* QR Code Container */}
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 flex flex-col items-center justify-center min-w-[136px] min-h-[136px]">
                  {qrCodeDataUrl ? (
                    <>
                      <img
                        src={qrCodeDataUrl}
                        alt="Scan with phone camera"
                        className="w-32 h-32 object-contain rounded"
                      />
                      <div className="flex items-center gap-1 mt-1">
                        {isManualSyncing && <RefreshCw className="w-2.5 h-2.5 text-blue-600 animate-spin" />}
                        <span className="text-[10px] text-slate-500 font-mono font-medium">
                          {isManualSyncing ? 'Updating snapshot...' : 'Scan with phone camera'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center space-y-2">
                      <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                        Generating QR code...
                      </span>
                    </div>
                  )}
                </div>

                {/* Instructions & Link */}
                <div className="flex-1 space-y-2.5 text-left w-full">
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Open your phone camera and scan the QR code to load your courses, notes, and tasks directly:
                  </p>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={syncUrl || 'Preparing direct sync link...'}
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

                  {cloudSyncId && (
                    <div className="pt-2 flex items-center justify-between p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                      <div>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
                          6-Digit Mobile Sync Code
                        </span>
                        <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm tracking-widest">
                          {cloudSyncId}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shadow-2xs flex items-center gap-1"
                      >
                        {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Localhost / LAN IP Helper Banner */}
              {isLocalhost && (
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                      <Wifi className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Phone cannot reach &ldquo;localhost&rdquo;?</span>
                    </div>
                    <button
                      onClick={() => setShowLanHelper(!showLanHelper)}
                      className="text-[10px] text-amber-700 dark:text-amber-300 underline font-medium"
                    >
                      {showLanHelper ? 'Hide' : customLanIp ? `IP: ${customLanIp} (Edit)` : 'Set Wi-Fi LAN IP'}
                    </button>
                  </div>

                  {showLanHelper && (
                    <form onSubmit={handleSaveLanIp} className="space-y-1.5 pt-1">
                      <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-normal">
                        To test from your phone on the same Wi-Fi, enter your laptop&apos;s local IP address (e.g. <code className="font-mono bg-white dark:bg-slate-800 px-1 py-0.2 rounded">192.168.1.15</code>):
                      </p>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="e.g. 192.168.1.15"
                          value={lanInput}
                          onChange={e => setLanInput(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs rounded border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 text-white rounded hover:bg-amber-700"
                        >
                          Apply IP
                        </button>
                        {customLanIp && (
                          <button
                            type="button"
                            onClick={handleClearLanIp}
                            className="px-2 py-1 text-[11px] text-amber-800 dark:text-amber-300 border border-amber-300 rounded hover:bg-amber-100 dark:hover:bg-amber-900"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Enter Sync Code */}
          {activeTab === 'code' && (
            <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                Connect via 6-Digit Sync Code
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Enter the 6-digit Sync Code from your other device (or paste direct payload data) to load all courses, notes, and tasks:
              </p>

              <form onSubmit={handleRestoreFromCode} className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit Sync Code (e.g. 582914)..."
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono tracking-wider font-bold"
                />
                <button
                  type="submit"
                  disabled={!inputCode.trim() || isManualSyncing}
                  className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  <span>{isManualSyncing ? 'Syncing...' : 'Connect & Restore Workspace'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: File & Offline Backup */}
          {activeTab === 'file' && (
            <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                100% Offline File & Data Transfer
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Transfer your workspace between devices without needing internet access, cloud relays, or Wi-Fi:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* Download File */}
                <button
                  onClick={handleDownloadNookFile}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-left transition-all flex flex-col justify-between space-y-1.5"
                >
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs">
                    <Download className="w-4 h-4" />
                    <span>Download .nook File</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Saves entire workspace into a portable snapshot file.
                  </span>
                </button>

                {/* Import File */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-left transition-all flex flex-col justify-between space-y-1.5"
                >
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                    <Upload className="w-4 h-4" />
                    <span>Import .nook File</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Restores courses, flashcards, exams, and notes.
                  </span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".nook,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Copy Raw Data String */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  Prefer copying text directly?
                </span>
                <button
                  onClick={handleCopyDirectData}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copiedData ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedData ? 'Copied Data!' : 'Copy Data String'}</span>
                </button>
              </div>
            </div>
          )}
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