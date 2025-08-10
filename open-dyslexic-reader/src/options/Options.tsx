import { useEffect, useMemo, useState } from 'react';
import type { Settings } from '../types/settings';
import type { Message } from '../types/messaging';

export function Options() {
  const [loading,setLoading] = useState(true);
  const [err,setErr] = useState<string|undefined>();

  // Live state from sliders/toggles
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [defFontSize, setDefFontSize] = useState(1.0);
  const [defSpacing, setDefSpacing]   = useState(0);
  const [defLH, setDefLH]             = useState(1.6);

  // Persisted state from the last save, used to check for changes
  const [initialState, setInitialState] = useState({
    globalEnabled: false,
    defFontSize: 1.0,
    defSpacing: 0,
    defLH: 1.6,
  });

  const [filter,setFilter] = useState('');
  const [rows,setRows] = useState<Array<{
    site:string; excluded:boolean; enabled:boolean; fontSize?:number; spacing?:number; lineHeight?:number;
  }>>([]);

  // Initial data load and listener setup
  useEffect(()=>{
    // Function to hydrate the UI from a settings object
    const hydrateUI = (s: Settings) => {
      const newInitial = {
        globalEnabled: !!s.globalEnabled,
        defFontSize: s.defaultFontSize ?? 1.0,
        defSpacing: s.defaultLetterSpacing ?? 0,
        defLH: s.defaultLineHeight ?? 1.6,
      };
      // Set both the live state and the "last saved" state
      setGlobalEnabled(newInitial.globalEnabled);
      setDefFontSize(newInitial.defFontSize);
      setDefSpacing(newInitial.defSpacing);
      setDefLH(newInitial.defLH);
      setInitialState(newInitial);

      const setSites = Object.entries(s.siteSettings ?? {}).map(([site, setting]) => ({
        site,
        excluded: (s.excludeSites ?? []).includes(site),
        enabled: !!setting.enabled,
        fontSize: setting.fontSize,
        spacing: setting.spacing,
        lineHeight: setting.lineHeight
      }));

      const onlyExcluded = (s.excludeSites ?? [])
        .filter(site => !(s.siteSettings ?? {})[site])
        .map(site => ({ site, excluded: true, enabled: false }));

      setRows([...setSites, ...onlyExcluded].sort((a,b)=>a.site.localeCompare(b.site)));
      setLoading(false);
    };

    // Initial load
    chrome.runtime.sendMessage({ action: 'GET_ALL_SETTINGS' }, (res: Settings) => {
      if (chrome.runtime.lastError) { setErr(chrome.runtime.lastError.message); setLoading(false); return; }
      if (!res) { setLoading(false); return; }
      hydrateUI(res);
    });

    // Listener for live updates
    const messageListener = (msg: Message) => {
      if (msg.action === 'SETTINGS_UPDATED' && msg.newSettings) {
        hydrateUI(msg.newSettings);
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  },[]);

  const changed = useMemo(()=>(
    Math.abs(defFontSize - initialState.defFontSize) > 1e-3 ||
    Math.abs(defSpacing - initialState.defSpacing) > 1e-3 ||
    Math.abs(defLH - initialState.defLH) > 1e-3 ||
    globalEnabled !== initialState.globalEnabled
  ), [defFontSize, defSpacing, defLH, globalEnabled, initialState]);

  const visible = useMemo(() => (
    rows.filter(r => !filter || r.site.toLowerCase().includes(filter.toLowerCase()))
  ), [rows, filter]);

  if (loading) {
    return <div className="container"><div className="header"><h1>Loading...</h1></div></div>;
  }

  if (err) {
    return <div className="container"><div className="header"><h1>Error</h1><p className="subtle">{err}</p></div></div>;
  }

  return (
    <div className="container">
      <div className="header">
        <div className="h1">OpenDyslexic — Options</div>
        <p className="subtle">Global defaults & per-site list</p>
      </div>

      <div className="grid">
        <div className="card">
          <div className="sectionTitle">Global Defaults</div>
          <div className="row" style={{marginTop:8}}>
            <div className={`switch ${globalEnabled?'on':'off'}`} role="switch" aria-checked={globalEnabled}
                 onClick={()=>setGlobalEnabled(v=>!v)}>
              <span className="small">{globalEnabled?'ON':'OFF'}</span>
              <div className="knob"></div>
            </div>
            <span className="subtle">Global default (OFF/ON)</span>
          </div>

          <div className="controls" style={{marginTop:12}}>
            <div className="field">
              <div className="label">Font Size <span className="badge">{defFontSize.toFixed(1)}x</span></div>
              <input className="range" type="range" min="0.5" max="2.0" step="0.1" value={defFontSize}
                onChange={e=>setDefFontSize(parseFloat(e.target.value))}/>
            </div>
            <div className="field">
              <div className="label">Letter Spacing <span className="badge">{defSpacing.toFixed(1)}px</span></div>
              <input className="range" type="range" min="0" max="5" step="0.5" value={defSpacing}
                onChange={e=>setDefSpacing(parseFloat(e.target.value))}/>
            </div>
            <div className="field">
              <div className="label">Line Height <span className="badge">{defLH.toFixed(1)}</span></div>
              <input className="range" type="range" min="1.0" max="2.0" step="0.1" value={defLH}
                onChange={e=>setDefLH(parseFloat(e.target.value))}/>
            </div>
          </div>

          <div className="actions" style={{marginTop:12}}>
            <button className="button" onClick={()=>{
              chrome.runtime.sendMessage({
                action:'SET_DEFAULTS',
                globalEnabled,
                defaultFontSize:defFontSize,
                defaultLetterSpacing:defSpacing,
                defaultLineHeight:defLH
              });
            }} disabled={!changed}>Save Defaults</button>
            <button className="button" onClick={()=>{
              chrome.runtime.sendMessage({
                action:'SET_DEFAULTS',
                globalEnabled:false,
                defaultFontSize:1.0,
                defaultLetterSpacing:0,
                defaultLineHeight:1.6
              });
            }} disabled={!changed}>Reset to Factory</button>
          </div>
        </div>

        <div className="card">
          <div className="sectionTitle">Sites</div>
          <div className="row" style={{marginBottom:8}}>
            <input className="input" placeholder="Filter by domain" value={filter} onChange={e=>setFilter(e.target.value.trim())}/>
            <button className="button" onClick={()=>{
              if (window.confirm('Reset all OpenDyslexic settings? This cannot be undone.')) {
                chrome.runtime.sendMessage({ action: 'RESET_ALL' }, () => {
                  location.reload();
                });
              }
            }}>
              Reset All Settings
            </button>
          </div>
          <table className="tbl">
            <thead>
              <tr><th style={{width:'40%'}}>Domain</th><th>Status</th><th>Typography</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {visible.length===0 && <tr><td colSpan={4} className="subtle" style={{textAlign: 'center', padding: '16px'}}>
                {rows.length > 0 ? 'No sites match your filter.' : 'No sites have been configured yet.'}
              </td></tr>}
              {visible.map(r => (
                <tr key={r.site}>
                  <td className="subtle">{r.site}</td>
                  <td>{r.excluded ? <span className="pill">Excluded</span> : <span className={`pill ${r.enabled?'on':'off'}`}>{r.enabled?'ON':'OFF'}</span>}</td>
                  <td>{r.excluded ? '—' : `${(r.fontSize??defFontSize).toFixed(1)}x / ${(r.spacing??defSpacing).toFixed(1)}px / ${(r.lineHeight??defLH).toFixed(1)}`}</td>
                  <td>
                    <div className="actions">
                      {!r.excluded && <button className="button" onClick={()=>{
                        chrome.runtime.sendMessage({ action:'SET_SITE_ENABLED', site:r.site, enabled: !r.enabled });
                      }}>Toggle</button>}
                      {!r.excluded && <button className="button" onClick={()=>{
                        chrome.runtime.sendMessage({ action:'REMOVE_SITE', site:r.site });
                      }}>Remove</button>}
                      {r.excluded
                        ? <button className="button" onClick={()=>{
                            chrome.runtime.sendMessage({ action:'REMOVE_EXCLUDED_SITE', site:r.site });
                          }}>Unexclude</button>
                        : <button className="button" onClick={()=>{
                            chrome.runtime.sendMessage({ action:'EXCLUDE_SITE', site:r.site });
                          }}>Exclude</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
