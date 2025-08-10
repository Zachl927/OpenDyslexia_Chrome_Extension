import { useEffect, useState } from "react";
import "./popup.css";
import type { Message } from '../types/messaging';

let t: number | undefined;
function ping(payload: Message) {
  window.clearTimeout(t);
  t = window.setTimeout(() => {
    chrome.runtime.sendMessage(payload, () => {
      /* ignore errors here */
    });
  }, 60); // small debounce
}

function Switch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className={`switch ${on ? "on" : "off"}`} onClick={() => onChange(!on)}>
      <div className="knob" />
      <div className="small">{on ? "ON" : ""}</div>
      <div className="small">{on ? "" : "OFF"}</div>
    </div>
  );
}

export function Popup() {
  const [host, setHost] = useState("…");
  const [enabled, setEnabled] = useState(false);
  const [force, setForce] = useState(false);
  const [fontSize, setFontSize] = useState(1.0);
  const [spacing, setSpacing] = useState(0);
  const [lineHeight, setLH] = useState(1.6);
  const [isExcluded, setExcluded] = useState(false);

  // Get the current settings for this site when the popup opens
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.url) {
        return;
      }
      const url = new URL(tabs[0].url);
      setHost(url.hostname);
    });
  }, []);

  // This effect runs once to get initial settings and then listens for updates
  useEffect(() => {
    if (!host || host === '…') return;

    // Get initial settings for this host
    chrome.runtime.sendMessage({ action: 'GET_SETTINGS', site: host }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res) {
        setEnabled(!!res.enabled);
        setForce(!!res.force);
        setExcluded(!!res.isExcluded);
        setFontSize(res.fontSize ?? 1.0);
        setSpacing(res.spacing ?? 0);
        setLH(res.lineHeight ?? 1.6);
      }
    });

    // Listener for live updates from the background script
    const messageListener = (msg: Message) => {
      if (msg.action === 'SETTINGS_UPDATED' && msg.newSettings) {
        const s = msg.newSettings;
        const isExcluded = s.excludeSites.includes(host);
        const perSite = s.siteSettings[host];
        const isEnabled = isExcluded ? false : (perSite?.enabled ?? s.globalEnabled);

        setEnabled(isEnabled);
        setForce(perSite?.force ?? false);
        setExcluded(isExcluded);
        setFontSize(perSite?.fontSize ?? s.defaultFontSize);
        setSpacing(perSite?.spacing ?? s.defaultLetterSpacing);
        setLH(perSite?.lineHeight ?? s.defaultLineHeight);
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    // Cleanup the listener when the popup is closed
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [host]);

  // Send settings updates to the background script, debounced.
  /*
  useEffect(() => {
    if (!host || host === "…") return;
    const handler = setTimeout(() => {
      chrome.runtime.sendMessage({
        action: "UPDATE_SETTINGS",
        site: host,
        fontSize,
        spacing,
        lineHeight,
      });
    }, 200); // 200ms debounce

    return () => clearTimeout(handler);
  }, [fontSize, spacing, lineHeight, host]);
  */

  const handleToggle = (next: boolean) => {
    chrome.runtime.sendMessage(
      { action: "SET_SITE_ENABLED", site: host, enabled: next },
      () => {
        if (chrome.runtime.lastError) {
          // It's possible the SW failed. The UI won't update in this case.
          // We could show an error, but for now we just log it.
          console.warn("Toggle failed", chrome.runtime.lastError.message);
        }
      },
    );
  };

  const handleForce = () => {
    const newForce = !force;
    setForce(newForce);
    chrome.runtime.sendMessage({
      action: "UPDATE_SETTINGS",
      site: host,
      force: newForce,
    });
  };

  return (
    <>
      <div className="header">
        <h2 className="title">OpenDyslexic</h2>
        <p className="subtle">Toggle the font on and off for {host}</p>
      </div>
      <fieldset disabled={isExcluded} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="card">
          <div className="row">
            <h3 style={{ margin: 0, fontSize: 16 }}>Enable for this site</h3>
            <Switch on={enabled} onChange={handleToggle} />
          </div>
          <div style={{ height: 10 }} />
          <div className="row">
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 400 }}>
              Force style on all elements
            </h3>
            <button disabled={!enabled} className="button" onClick={handleForce}>
              {force ? "Forced" : "Force"}
            </button>
          </div>
        </div>
        <div className="card" aria-disabled={!enabled}>
          <div className="sectionTitle">Typography Controls</div>
          <fieldset
            disabled={!enabled}
            style={{ border: 0, padding: 0, margin: 0, opacity: enabled ? 1 : 0.6 }}
          >
            <div className="slider">
              <label>
                Font Size <span className="badge">{fontSize.toFixed(1)}x</span>
              </label>
              <input
                className="range"
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={fontSize}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setFontSize(v);
                  if (enabled)
                    ping({ action: "UPDATE_SETTINGS", site: host, fontSize: v });
                }}
              />
              <div className="help">
                <span>0.5x</span>
                <span>2.0x</span>
              </div>
            </div>
            <div className="slider">
              <label>
                Letter Spacing <span className="badge">{spacing.toFixed(1)}px</span>
              </label>
              <input
                className="range"
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={spacing}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setSpacing(v);
                  if (enabled)
                    ping({ action: "UPDATE_SETTINGS", site: host, spacing: v });
                }}
              />
              <div className="help">
                <span>0px</span>
                <span>5px</span>
              </div>
            </div>
            <div className="slider">
              <label>
                Line Height <span className="badge">{lineHeight.toFixed(1)}</span>
              </label>
              <input
                className="range"
                type="range"
                min="1.0"
                max="2.0"
                step="0.1"
                value={lineHeight}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setLH(v);
                  if (enabled)
                    ping({
                      action: "UPDATE_SETTINGS",
                      site: host,
                      lineHeight: v,
                    });
                }}
              />
              <div className="help">
                <span>1.0</span>
                <span>2.0</span>
              </div>
            </div>
          </fieldset>
        </div>
      </fieldset>
      <div className="card">
        <button
          className="bigDanger"
          onClick={() => {
            chrome.runtime.sendMessage(
              { action: "EXCLUDE_SITE", site: host },
              () => {
                // Even if lastError, close; SW handles persistence
                setEnabled(false);
                window.close();
              },
            );
          }}
        >
          Exclude this site (Safe mode: adds to block list)
        </button>
      </div>
      <div className="footerCard">
        <div className="subtle">Current page status:</div>
        <div className="pills">
          <span className="pill pill--muted">
            {isExcluded ? "Excluded" : enabled ? "Enabled" : "Disabled"}
          </span>
          <span className="pill pill--muted">
            {Math.abs(fontSize - 1.0) > 1e-3 ||
            Math.abs(spacing - 0) > 1e-3 ||
            Math.abs(lineHeight - 1.6) > 1e-3
              ? "This site: customized"
              : "Defaults in use"}
          </span>
        </div>
        <div className="right" style={{ marginTop: 10 }}>
          <button
            className="button"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            Open Options
          </button>
        </div>
      </div>
    </>
  );
}
