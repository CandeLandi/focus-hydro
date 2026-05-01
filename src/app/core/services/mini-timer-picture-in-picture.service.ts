import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

export interface MiniTimerViewState {
  appName: string;
  modeLabel: string;
  mode: 'focus' | 'break';
  remainingTime: string;
  sessionLabel: string;
  isRunning: boolean;
  canSwitchSegment: boolean;
  switchSegmentLabel: string;
  primaryActionLabel: string;
  closeLabel?: string;
}

export interface MiniTimerActions {
  onToggleRun: () => void;
  onSwitchSegment: () => void;
  onClose: () => void;
}

@Injectable({ providedIn: 'root' })
export class MiniTimerPictureInPictureService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly documentRef = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private pipWindow: Window | null = null;
  private actions: MiniTimerActions | null = null;
  private onPipWindowClosedRef: (() => void) | null = null;

  isSupported(): boolean {
    return this.isBrowser && typeof window.documentPictureInPicture !== 'undefined';
  }

  isOpen(): boolean {
    return this.pipWindow !== null && !this.pipWindow.closed;
  }

  async open(state: MiniTimerViewState, actions: MiniTimerActions): Promise<boolean> {
    if (!this.isSupported()) return false;
    this.actions = actions;

    if (this.isOpen()) {
      this.update(state);
      this.pipWindow?.focus();
      return true;
    }

    const pipApi = window.documentPictureInPicture;
    if (!pipApi) return false;

    const win = await pipApi.requestWindow({
      width: 332,
      height: 236
    });

    this.pipWindow = win;
    this.renderShell(win);
    this.attachEvents(win);
    this.update(state);
    return true;
  }

  update(state: MiniTimerViewState): void {
    if (!this.isOpen() || !this.pipWindow) return;
    const doc = this.pipWindow.document;

    this.setText(doc, 'mini-app-title', state.appName);
    this.setText(doc, 'mini-mode-text', state.modeLabel);
    this.setText(doc, 'mini-time-text', state.remainingTime);
    this.setText(doc, 'mini-session-text', state.sessionLabel);

    const card = doc.getElementById('mini-root-card');
    if (card) {
      card.setAttribute('data-mode', state.mode);
      card.setAttribute('data-running', String(state.isRunning));
    }

    const switchBtn = doc.getElementById('mini-switch-btn') as HTMLButtonElement | null;
    if (switchBtn) {
      switchBtn.textContent = state.switchSegmentLabel;
      switchBtn.disabled = !state.canSwitchSegment;
      switchBtn.setAttribute('aria-disabled', String(!state.canSwitchSegment));
    }

    const toggleBtn = doc.getElementById('mini-toggle-btn') as HTMLButtonElement | null;
    if (toggleBtn) {
      toggleBtn.textContent = state.primaryActionLabel;
      toggleBtn.setAttribute('data-running', String(state.isRunning));
    }

  }

  close(): void {
    if (this.pipWindow && !this.pipWindow.closed) {
      this.pipWindow.close();
    }
    this.cleanupReferences();
  }

  private renderShell(win: Window): void {
    const doc = win.document;
    doc.head.innerHTML = '';
    doc.body.innerHTML = '';
    doc.title = 'FocusFlow';

    const style = doc.createElement('style');
    style.textContent = `
      :root {
        color-scheme: dark;
      }
      * {
        box-sizing: border-box;
      }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        font-family: Inter, Segoe UI, system-ui, -apple-system, sans-serif;
        background: #050914;
      }
      body {
        padding: 8px;
      }
      .mini-card {
        height: 100%;
        border-radius: 16px;
        border: 1px solid rgba(83, 111, 153, 0.28);
        background:
          radial-gradient(circle at 50% -18%, rgba(56, 189, 248, 0.08), rgba(56, 189, 248, 0) 48%),
          linear-gradient(180deg, rgba(9, 13, 24, 0.96) 0%, rgba(5, 9, 18, 0.98) 100%);
        color: rgba(240, 249, 255, 0.96);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.03),
          0 18px 38px rgba(0, 0, 0, 0.35);
        padding: 11px 14px 12px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 8px;
      }
      .mini-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .mini-title {
        font-size: 11px;
        font-weight: 700;
        margin: 0;
        letter-spacing: -0.01em;
        color: rgba(203, 222, 248, 0.72);
      }
      .mini-live {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: #35e8ff;
        opacity: 0.72;
        box-shadow: 0 0 10px rgba(53, 232, 255, 0.34);
      }
      .mini-center {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 6px;
        transform: translateY(-1px);
        position: relative;
      }
      .mini-bottle {
        width: 54px;
        height: 76px;
        display: block;
        opacity: 0.18;
        filter: drop-shadow(0 4px 10px rgba(56, 189, 248, 0.1));
        position: absolute;
        top: -6px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 0;
        pointer-events: none;
      }
      .mini-mode-badge {
        border-radius: 999px;
        border: 1px solid rgba(85, 99, 124, 0.32);
        background: rgba(5, 9, 18, 0.62);
        color: rgba(203, 213, 225, 0.88);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 0.26rem 0.62rem;
        z-index: 1;
      }
      .mini-mode {
        margin: 0;
      }
      .mini-time {
        font-size: 50px;
        font-weight: 780;
        letter-spacing: -0.03em;
        line-height: 1;
        margin: 2px 0 0;
        font-variant-numeric: tabular-nums;
        color: rgba(226, 232, 240, 0.88);
        z-index: 1;
        transition: transform 180ms ease, opacity 180ms ease, color 180ms ease, text-shadow 180ms ease;
      }
      .mini-session {
        font-size: 11px;
        color: rgba(160, 182, 214, 0.82);
        margin: 0;
        z-index: 1;
      }
      .mini-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .mini-btn {
        border-radius: 12px;
        border: 1px solid rgba(100, 116, 139, 0.24);
        background: linear-gradient(180deg, rgba(21, 28, 42, 0.92) 0%, rgba(10, 15, 26, 0.96) 100%);
        color: rgba(226, 232, 240, 0.88);
        font-size: 12px;
        font-weight: 600;
        min-height: 36px;
        padding: 8px 10px;
        cursor: pointer;
        transition: border-color 140ms ease, background 140ms ease, color 140ms ease, transform 140ms ease;
      }
      .mini-btn:hover {
        border-color: rgba(148, 163, 184, 0.36);
        transform: translateY(-1px);
      }
      .mini-btn[disabled] {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .mini-btn-primary {
        background: linear-gradient(180deg, rgba(31, 41, 55, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%);
        color: rgba(241, 245, 249, 0.94);
        border-color: rgba(100, 116, 139, 0.32);
      }
      .mini-card[data-mode="focus"][data-running="true"] {
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.03),
          0 18px 38px rgba(0, 0, 0, 0.36),
          0 0 28px rgba(96, 165, 250, 0.07);
      }
      .mini-card[data-mode="focus"][data-running="true"] .mini-time,
      .mini-card[data-mode="focus"][data-running="true"] .mini-mode-badge {
        color: rgba(125, 211, 252, 0.96);
      }
      .mini-card[data-mode="focus"][data-running="true"] .mini-time {
        text-shadow: 0 0 18px rgba(56, 189, 248, 0.12);
      }
      .mini-card[data-mode="focus"][data-running="true"] .mini-btn-primary {
        background: linear-gradient(180deg, rgba(51, 107, 132, 0.82) 0%, rgba(22, 78, 99, 0.86) 100%);
        border-color: rgba(125, 211, 252, 0.42);
        color: rgba(240, 249, 255, 0.96);
      }
      .mini-card[data-mode="break"] .mini-mode-badge {
        color: rgba(251, 191, 36, 0.92);
      }
      .mini-card[data-mode="break"] .mini-time {
        color: rgba(251, 191, 36, 0.92);
      }
      .mini-card[data-mode="break"][data-running="true"] {
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.03),
          0 18px 38px rgba(0, 0, 0, 0.36),
          0 0 28px rgba(245, 158, 11, 0.07);
      }
      .mini-card[data-mode="break"] .mini-btn-primary {
        background: linear-gradient(180deg, rgba(92, 57, 18, 0.78) 0%, rgba(64, 43, 18, 0.86) 100%);
        border-color: rgba(251, 191, 36, 0.34);
        color: rgba(255, 247, 237, 0.96);
      }
      .mini-card[data-running="true"] .mini-bottle {
        animation: miniBottlePulse 2.2s ease-in-out infinite;
      }
      .mini-card[data-running="true"] .mini-time {
        animation: miniTimeGlow 2.2s ease-in-out infinite;
      }
      @keyframes miniBottlePulse {
        0%, 100% { opacity: 0.16; }
        50% { opacity: 0.24; }
      }
      @keyframes miniTimeGlow {
        0%, 100% { opacity: 0.95; transform: translateY(0); }
        50% { opacity: 1; transform: translateY(-1px); }
      }
      @media (max-width: 290px) {
        .mini-time {
          font-size: 34px;
        }
        .mini-actions {
          grid-template-columns: 1fr;
        }
      }
    `;
    doc.head.appendChild(style);

    const root = doc.createElement('div');
    root.id = 'mini-root-card';
    root.className = 'mini-card';
    root.innerHTML = `
      <div class="mini-header">
        <h2 id="mini-app-title" class="mini-title">FocusFlow</h2>
        <span class="mini-live" aria-hidden="true"></span>
      </div>
      <div class="mini-center">
        <svg class="mini-bottle" viewBox="0 0 200 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="70" y="12" width="60" height="22" rx="8" fill="#22d3ee" fill-opacity="0.9"/>
          <rect x="66" y="30" width="68" height="16" rx="5" fill="#0891b2" fill-opacity="0.86"/>
          <rect x="56" y="82" width="88" height="176" rx="18" fill="rgba(110,235,255,0.05)" stroke="#4ce8ff" stroke-width="8"/>
          <rect x="60" y="150" width="80" height="104" rx="12" fill="#1CD4FF" fill-opacity="0.35"/>
          <rect x="73" y="106" width="12" height="115" rx="6" fill="rgba(255,255,255,0.18)"/>
        </svg>
        <p id="mini-mode-text" class="mini-mode mini-mode-badge">Focus</p>
        <p id="mini-time-text" class="mini-time">25:00</p>
        <p id="mini-session-text" class="mini-session">Session 1</p>
      </div>
      <div class="mini-actions">
        <button id="mini-toggle-btn" class="mini-btn mini-btn-primary" type="button">Pause</button>
        <button id="mini-switch-btn" class="mini-btn" type="button">Switch</button>
      </div>
    `;
    doc.body.appendChild(root);
  }

  private attachEvents(win: Window): void {
    const doc = win.document;
    const onToggle = () => this.actions?.onToggleRun();
    const onSwitch = () => this.actions?.onSwitchSegment();
    const onPipClose = () => {
      this.actions?.onClose();
      this.cleanupReferences();
    };

    const toggleBtn = doc.getElementById('mini-toggle-btn') as HTMLButtonElement | null;
    const switchBtn = doc.getElementById('mini-switch-btn') as HTMLButtonElement | null;

    toggleBtn?.addEventListener('click', onToggle);
    switchBtn?.addEventListener('click', onSwitch);
    win.addEventListener('pagehide', onPipClose);
    win.addEventListener('beforeunload', onPipClose);

    this.onPipWindowClosedRef = () => {
      toggleBtn?.removeEventListener('click', onToggle);
      switchBtn?.removeEventListener('click', onSwitch);
      win.removeEventListener('pagehide', onPipClose);
      win.removeEventListener('beforeunload', onPipClose);
    };
  }

  private cleanupReferences(): void {
    this.onPipWindowClosedRef?.();
    this.onPipWindowClosedRef = null;
    this.pipWindow = null;
    this.actions = null;
  }

  private setText(doc: Document, id: string, value: string): void {
    const node = doc.getElementById(id);
    if (node) node.textContent = value;
  }
}
