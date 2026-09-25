import React, { useState, useEffect, useMemo } from 'react';
import { 
  Map as MapIcon, 
  Search, 
  Plus, 
  TrainFront, 
  ArrowRight, 
  MapPin, 
  MoreHorizontal, 
  X,
  Share,
  Navigation,
  CheckCircle2,
  Settings,
  ChevronDown
} from 'lucide-react';

// --- DATA LAYER (Offline-ready topological graph) ---
const METRO_DATA = {
  stations: [
    { id: 's1', name: 'Samaypur Badli', lines: ['yellow'], lat: 28.7460, lng: 77.1396 },
    { id: 's2', name: 'Kashmere Gate', lines: ['yellow', 'red', 'violet'], lat: 28.6665, lng: 77.2253 },
    { id: 's3', name: 'Rajiv Chowk', lines: ['yellow', 'blue'], lat: 28.6328, lng: 77.2197 },
    { id: 's4', name: 'Central Secretariat', lines: ['yellow', 'violet'], lat: 28.6143, lng: 77.2117 },
    { id: 's5', name: 'Hauz Khas', lines: ['yellow', 'magenta'], lat: 28.5432, lng: 77.2005 },
    { id: 's6', name: 'HUDA City Centre', lines: ['yellow'], lat: 28.4593, lng: 77.0724 },
    { id: 's7', name: 'Dwarka Sec 21', lines: ['blue'], lat: 28.5523, lng: 77.0583 },
    { id: 's8', name: 'Janakpuri West', lines: ['blue', 'magenta'], lat: 28.6294, lng: 77.0777 },
    { id: 's9', name: 'Mandi House', lines: ['blue', 'violet'], lat: 28.6258, lng: 77.2343 },
    { id: 's10', name: 'Botanical Garden', lines: ['blue', 'magenta'], lat: 28.5640, lng: 77.3208 },
    { id: 's11', name: 'Noida City Centre', lines: ['blue'], lat: 28.5747, lng: 77.3561 },
    { id: 's12', name: 'Rithala', lines: ['red'], lat: 28.7207, lng: 77.1071 },
    { id: 's13', name: 'Dilshad Garden', lines: ['red'], lat: 28.6841, lng: 77.3204 },
    { id: 's14', name: 'Lajpat Nagar', lines: ['violet', 'pink'], lat: 28.5706, lng: 77.2424 },
    { id: 's15', name: 'Badarpur', lines: ['violet'], lat: 28.5029, lng: 77.3031 },
  ],
  edges: [
    { src: 's1', tgt: 's2', time: 20, line: 'yellow' },
    { src: 's2', tgt: 's3', time: 10, line: 'yellow' },
    { src: 's3', tgt: 's4', time: 5, line: 'yellow' },
    { src: 's4', tgt: 's5', time: 15, line: 'yellow' },
    { src: 's5', tgt: 's6', time: 25, line: 'yellow' },
    { src: 's7', tgt: 's8', time: 20, line: 'blue' },
    { src: 's8', tgt: 's3', time: 30, line: 'blue' },
    { src: 's3', tgt: 's9', time: 5, line: 'blue' },
    { src: 's9', tgt: 's10', time: 25, line: 'blue' },
    { src: 's10', tgt: 's11', time: 10, line: 'blue' },
    { src: 's12', tgt: 's2', time: 35, line: 'red' },
    { src: 's2', tgt: 's13', time: 20, line: 'red' },
    { src: 's8', tgt: 's5', time: 25, line: 'magenta' },
    { src: 's5', tgt: 's10', time: 20, line: 'magenta' },
    { src: 's2', tgt: 's9', time: 12, line: 'violet' },
    { src: 's9', tgt: 's4', time: 8, line: 'violet' },
    { src: 's4', tgt: 's14', time: 15, line: 'violet' },
    { src: 's14', tgt: 's15', time: 25, line: 'violet' },
  ]
};

// --- ALGORITHMS ---
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI/180);
  const dLon = (lon2 - lon1) * (Math.PI/180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

const calculateFare = (distKm) => {
  if (distKm <= 2) return 10;
  if (distKm <= 5) return 20;
  if (distKm <= 12) return 30;
  if (distKm <= 21) return 40;
  if (distKm <= 32) return 50;
  return 60;
};

const runDijkstra = (startId, endId) => {
  const graph = {};
  METRO_DATA.stations.forEach(s => graph[s.id] = []);
  METRO_DATA.edges.forEach(e => {
    graph[e.src].push({ tgt: e.tgt, time: e.time, line: e.line });
    graph[e.tgt].push({ tgt: e.src, time: e.time, line: e.line });
  });

  const distances = {};
  const previous = {};
  const previousLine = {};
  const unvisited = new Set();

  METRO_DATA.stations.forEach(s => {
    distances[s.id] = Infinity;
    previous[s.id] = null;
    previousLine[s.id] = null;
    unvisited.add(s.id);
  });
  distances[startId] = 0;

  while (unvisited.size > 0) {
    let curr = Array.from(unvisited).reduce((minNode, node) => 
      distances[node] < distances[minNode] ? node : minNode
    );

    if (distances[curr] === Infinity || curr === endId) break;
    unvisited.delete(curr);

    graph[curr].forEach(neighbor => {
      if (!unvisited.has(neighbor.tgt)) return;
      
      let penalty = 0;
      if (previousLine[curr] && previousLine[curr] !== neighbor.line) {
        penalty = 5; // 5 min interchange penalty
      }
      
      const alt = distances[curr] + neighbor.time + penalty;
      if (alt < distances[neighbor.tgt]) {
        distances[neighbor.tgt] = alt;
        previous[neighbor.tgt] = curr;
        previousLine[neighbor.tgt] = neighbor.line;
      }
    });
  }

  const path = [];
  let u = endId;
  let totalInterchanges = 0;
  let linesUsed = new Set();
  
  if (previous[u] !== null || u === startId) {
    while (u !== null) {
      const station = METRO_DATA.stations.find(s => s.id === u);
      path.unshift(station);
      if (previousLine[u]) linesUsed.add(previousLine[u]);
      u = previous[u];
    }
  }

  let prevLine = null;
  for (let i = 1; i < path.length; i++) {
     const edge = graph[path[i-1].id].find(e => e.tgt === path[i].id);
     if (prevLine && prevLine !== edge.line) totalInterchanges++;
     prevLine = edge.line;
  }

  return { path, time: distances[endId], interchanges: totalInterchanges, lines: Array.from(linesUsed) };
};

const calculateFullRoute = (startName, viaNames, endName) => {
  const getStationId = name => METRO_DATA.stations.find(s => s.name.toLowerCase() === name.toLowerCase())?.id;
  
  const stops = [startName, ...viaNames, endName].map(getStationId).filter(id => id);
  if (stops.length < 2) return null;

  let fullPath = [];
  let totalTime = 0;
  let totalInterchanges = 0;
  let allLines = new Set();
  let totalDist = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const segment = runDijkstra(stops[i], stops[i+1]);
    if (!segment.path.length) return null;

    if (i > 0) segment.path.shift(); 
    fullPath = [...fullPath, ...segment.path];
    totalTime += segment.time;
    totalInterchanges += segment.interchanges;
    segment.lines.forEach(l => allLines.add(l));
  }
  
  for (let i = 0; i < fullPath.length - 1; i++) {
    totalDist += haversineDistance(fullPath[i].lat, fullPath[i].lng, fullPath[i+1].lat, fullPath[i+1].lng);
  }

  return {
    line: Array.from(allLines)[0] || 'all',
    stations: fullPath.map(s => s.name),
    pathNodes: fullPath,
    duration: `${totalTime}m`,
    fare: `₹${calculateFare(totalDist)}`,
    interchanges: totalInterchanges,
    rawLines: Array.from(allLines),
    distKm: totalDist
  };
};

function getLineColor(line) {
  const colors = {
    yellow: '#FFD700', blue: '#00BFFF', red: '#EF4444', 
    magenta: '#EC4899', violet: '#8B5CF6', pink: '#F472B6', all: '#FFFFFF'
  };
  return colors[line] || '#71717a';
}


// --- MAIN APP SHELL ---
export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  
  const [journeyHistory, setJourneyHistory] = useState([]);
  const [passportStats, setPassportStats] = useState({ distance: 0, stations: 0, trips: 0, lines: [] });

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW setup failed', err));
      });
    }
    
    const saved = localStorage.getItem('delhiMetroHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      setJourneyHistory(parsed);
      calculateStats(parsed);
    }
  }, []);

  const calculateStats = (history) => {
    let dist = 0;
    let stSet = new Set();
    let lnSet = new Set();
    
    history.forEach(h => {
      dist += h.distKm || 0;
      h.stations.forEach(s => stSet.add(s));
      (h.rawLines || [h.line]).forEach(l => lnSet.add(l));
    });

    setPassportStats({
      distance: Math.round(dist),
      stations: stSet.size,
      trips: history.length,
      lines: Array.from(lnSet)
    });
  };

  const saveJourney = (route) => {
    const newEntry = {
      ...route,
      id: Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [newEntry, ...journeyHistory];
    setJourneyHistory(updated);
    calculateStats(updated);
    localStorage.setItem('delhiMetroHistory', JSON.stringify(updated));
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050505] text-white overflow-hidden relative font-sans selection:bg-blue-500/30 flex flex-col">
      
      {/* Background Interactive Map */}
      <InteractiveMapBackground selectedRoute={selectedRoute} onStationClick={(st) => showToast(st)} />

      {/* Dynamic Main Content Wrapper */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end pb-28">
        <div className="w-full relative pointer-events-auto h-full overflow-hidden flex flex-col justify-end">
          {activeTab === 'home' && <HomeTab showToast={showToast} onSelectRoute={setSelectedRoute} journeys={journeyHistory} />}
          {activeTab === 'search' && <SearchTab showToast={showToast} onRouteCalculated={setSelectedRoute} onSaveJourney={saveJourney} />}
          {activeTab === 'passport' && <PassportTab showToast={showToast} stats={passportStats} />}
        </div>
      </div>

      {/* Floating Bottom Nav - Matches the visual reference precisely */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-11/12 max-w-sm">
        <BottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <Toast message={toastMessage} />
    </div>
  );
}

// --- COMPONENTS ---

function BottomTabBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', icon: TrainFront, label: 'My Journeys' },
    { id: 'search', icon: Search, label: 'Search Route' },
    { id: 'passport', icon: MapIcon, label: 'Passport' } // Used MapIcon as Passport placeholder
  ];

  return (
    <div className="flex justify-between items-center px-4 py-3 bg-[#1c1c1e]/90 backdrop-blur-3xl rounded-full border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center w-20 py-1 transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${isActive ? 'opacity-100 scale-105' : 'opacity-50 hover:opacity-80 active:scale-95'}`}
          >
            <Icon size={24} className={`mb-1 ${isActive ? 'text-[#00BFFF]' : 'text-white'}`} />
            <span className={`text-[10px] font-semibold ${isActive ? 'text-[#00BFFF]' : 'text-white'}`}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function InteractiveMapBackground({ selectedRoute, onStationClick }) {
  // Normalize Lat/Lng to relative SVG percentage coordinates for the abstract map view
  const mapData = useMemo(() => {
    const lats = METRO_DATA.stations.map(s => s.lat);
    const lngs = METRO_DATA.stations.map(s => s.lng);
    const minLat = Math.min(...lats) - 0.05, maxLat = Math.max(...lats) + 0.05;
    const minLng = Math.min(...lngs) - 0.05, maxLng = Math.max(...lngs) + 0.05;

    const getCoord = (lat, lng) => ({
      x: ((lng - minLng) / (maxLng - minLng)) * 100,
      y: ((maxLat - lat) / (maxLat - minLat)) * 100
    });

    const routeSet = new Set(selectedRoute?.stations || []);

    return { getCoord, routeSet };
  }, [selectedRoute]);

  return (
    <div className="absolute inset-0 top-0 left-0 right-0 bottom-1/2 opacity-70 pointer-events-auto">
      <svg className="w-full h-full p-8 drop-shadow-2xl" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {/* Draw Edges */}
        {METRO_DATA.edges.map((e, idx) => {
          const src = METRO_DATA.stations.find(s => s.id === e.src);
          const tgt = METRO_DATA.stations.find(s => s.id === e.tgt);
          const srcPos = mapData.getCoord(src.lat, src.lng);
          const tgtPos = mapData.getCoord(tgt.lat, tgt.lng);
          
          const inRoute = mapData.routeSet.has(src.name) && mapData.routeSet.has(tgt.name);
          const isFaded = selectedRoute && !inRoute;

          return (
            <line 
              key={`edge-${idx}`}
              x1={`${srcPos.x}%`} y1={`${srcPos.y}%`} 
              x2={`${tgtPos.x}%`} y2={`${tgtPos.y}%`}
              stroke={getLineColor(e.line)}
              strokeWidth={inRoute ? "1.5" : "0.5"}
              strokeOpacity={isFaded ? 0.1 : 0.6}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-in-out"
            />
          );
        })}

        {/* Draw Stations */}
        {METRO_DATA.stations.map((s, idx) => {
          const pos = mapData.getCoord(s.lat, s.lng);
          const inRoute = mapData.routeSet.has(s.name);
          const isFaded = selectedRoute && !inRoute;

          return (
            <circle 
              key={`st-${idx}`}
              cx={`${pos.x}%`} cy={`${pos.y}%`} 
              r={inRoute ? "1.5" : "0.8"}
              fill={inRoute ? "#ffffff" : "#4b5563"}
              className={`transition-all duration-700 cursor-pointer ${isFaded ? 'opacity-20' : 'opacity-100 hover:scale-150 origin-center'}`}
              onClick={() => onStationClick(s.name)}
            />
          );
        })}
      </svg>
      {/* Dark fade out toward the bottom panels */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
    </div>
  );
}


function HomeTab({ showToast, onSelectRoute, journeys = [] }) {
  return (
    <div className="w-full flex-1 flex flex-col justify-end pointer-events-none">
      <div className="bg-[#1c1c1e]/95 backdrop-blur-xl h-[70vh] rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/10 pt-8 px-6 flex flex-col pointer-events-auto transition-transform duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.1)] animate-in slide-in-from-bottom-full">
        
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6"></div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white/90">My Journeys</h1>
          <button onClick={() => showToast("Account settings")} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all">
            <Settings size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
          <h2 className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-4 px-1">Recent Commutes</h2>
          <div className="space-y-3">
            {journeys.length === 0 ? (
               <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/5">
                 <MapIcon size={32} className="mx-auto text-gray-500 mb-3" />
                 <p className="text-gray-400 text-sm">No saved journeys yet. Head to Search to plot a route.</p>
               </div>
            ) : journeys.map((journey, idx) => (
              <button 
                key={idx} 
                onClick={() => {
                  onSelectRoute(journey);
                  showToast(`Viewing route: ${journey.stations[0]} to ${journey.stations[journey.stations.length-1]}`);
                }}
                className="w-full text-left flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-3xl active:scale-[0.98] transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4 overflow-hidden">
                  <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center border border-white/5 shadow-inner group-hover:bg-white/5 transition-colors flex-shrink-0">
                    <TrainFront size={20} className="text-gray-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 text-white/90">
                      <span className="font-semibold truncate max-w-[120px]">{journey.stations[0]}</span>
                      <ArrowRight size={14} className="text-gray-500 flex-shrink-0" />
                      <span className="font-semibold truncate max-w-[120px]">{journey.stations[journey.stations.length-1]}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getLineColor(journey.line) }}></span>
                      <p className="text-xs text-gray-400 truncate">{journey.duration} • {journey.date}</p>
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-black/20 flex items-center justify-center group-hover:bg-white/10 transition-colors ml-2">
                   <ChevronDown size={16} className="text-gray-500 group-hover:text-white -rotate-90" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchTab({ showToast, onRouteCalculated, onSaveJourney }) {
  const [viaStations, setViaStations] = useState([]);
  const [startStation, setStartStation] = useState('');
  const [endStation, setEndStation] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [suggestions, setSuggestions] = useState({ field: null, list: [] });

  const allStationNames = METRO_DATA.stations.map(s => s.name);

  const handleInput = (val, fieldName) => {
    if (fieldName === 'start') setStartStation(val);
    else if (fieldName === 'end') setEndStation(val);
    else {
      const newVias = [...viaStations];
      newVias[fieldName] = val;
      setViaStations(newVias);
    }
    
    if (val.length > 0) {
      const filtered = allStationNames.filter(s => s.toLowerCase().includes(val.toLowerCase()) && s !== val);
      setSuggestions({ field: fieldName, list: filtered.slice(0, 4) });
    } else {
      setSuggestions({ field: null, list: [] });
    }
  };

  const applySuggestion = (name) => {
    if (suggestions.field === 'start') setStartStation(name);
    else if (suggestions.field === 'end') setEndStation(name);
    else {
      const newVias = [...viaStations];
      newVias[suggestions.field] = name;
      setViaStations(newVias);
    }
    setSuggestions({ field: null, list: [] });
  };
  
  const addViaStation = () => {
    setViaStations([...viaStations, '']);
    showToast("Added intermediate stop");
  };

  const removeViaStation = (indexToRemove) => {
    setViaStations(viaStations.filter((_, idx) => idx !== indexToRemove));
    showToast("Removed stop");
  };

  const calculateRoute = () => {
    if (!startStation || !endStation) {
      showToast("Please enter Start and End stations");
      return;
    }
    
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      const result = calculateFullRoute(startStation, viaStations.filter(v=>v), endStation);
      
      if (!result) {
        showToast("Route not found. Check station names.");
        return;
      }
      
      setRouteResult(result);
      onRouteCalculated(result);
      showToast("Route optimized successfully");
    }, 600);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-end pointer-events-none">
      <div className="bg-[#1c1c1e]/95 backdrop-blur-xl min-h-[75vh] max-h-[85vh] rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/10 pt-8 px-6 flex flex-col pointer-events-auto transition-transform duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.1)] animate-in slide-in-from-bottom-full relative">
        
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6"></div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white/90">Find Route</h1>
          <button onClick={() => showToast("Options menu")} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all">
            <MoreHorizontal size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
          <div className="bg-[#2c2c2e]/40 rounded-[32px] p-6 border border-white/5 relative shadow-inner">
            <div className="absolute left-[39px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-green-500 via-gray-600 to-red-500 rounded-full opacity-50"></div>

            {/* Start Station */}
            <div className="flex items-center space-x-4 mb-5 relative z-10">
              <div className="w-10 h-10 rounded-full bg-[#1c1c1e] border-[3px] border-green-500 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
              </div>
              <div className="w-full relative">
                <input 
                  value={startStation}
                  onChange={(e) => handleInput(e.target.value, 'start')}
                  type="text" 
                  placeholder="Start (e.g. Dwarka)" 
                  className="w-full bg-transparent border-b border-white/10 pb-2 text-xl font-medium focus:outline-none focus:border-white transition-colors placeholder:text-gray-600"
                />
                {suggestions.field === 'start' && suggestions.list.length > 0 && (
                   <div className="absolute top-full left-0 right-0 bg-[#3c3c3e] rounded-xl mt-2 p-2 shadow-2xl z-50">
                     {suggestions.list.map(s => (
                       <div key={s} onClick={() => applySuggestion(s)} className="p-2 hover:bg-white/10 rounded-lg cursor-pointer text-sm font-medium">{s}</div>
                     ))}
                   </div>
                )}
              </div>
            </div>

            {/* Via Stations */}
            <div className="space-y-5">
              {viaStations.map((via, idx) => (
                <div key={idx} className="flex items-center space-x-4 relative z-10 animate-in slide-in-from-top-4 fade-in duration-300">
                  <div className="w-10 h-10 rounded-full bg-[#1c1c1e] border-[3px] border-gray-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <div className="w-2.5 h-2.5 bg-gray-500 rounded-full"></div>
                  </div>
                  <div className="w-full relative">
                    <input 
                      value={via}
                      onChange={(e) => handleInput(e.target.value, idx)}
                      type="text" 
                      placeholder="Via Station" 
                      className="w-full bg-transparent border-b border-white/10 pb-2 text-xl font-medium focus:outline-none focus:border-white transition-colors placeholder:text-gray-600"
                    />
                    {suggestions.field === idx && suggestions.list.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-[#3c3c3e] rounded-xl mt-2 p-2 shadow-2xl z-50">
                        {suggestions.list.map(s => (
                          <div key={s} onClick={() => applySuggestion(s)} className="p-2 hover:bg-white/10 rounded-lg cursor-pointer text-sm font-medium">{s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => removeViaStation(idx)}
                    className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 active:scale-90 transition-all flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* End Station */}
            <div className="flex items-center space-x-4 mt-5 relative z-10">
              <div className="w-10 h-10 rounded-full bg-[#1c1c1e] border-[3px] border-red-500 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <MapPin size={16} className="text-red-500" />
              </div>
              <div className="w-full relative">
                <input 
                  value={endStation}
                  onChange={(e) => handleInput(e.target.value, 'end')}
                  type="text" 
                  placeholder="Destination (e.g. Noida)" 
                  className="w-full bg-transparent border-b border-white/10 pb-2 text-xl font-medium focus:outline-none focus:border-white transition-colors placeholder:text-gray-600"
                />
                {suggestions.field === 'end' && suggestions.list.length > 0 && (
                   <div className="absolute top-full left-0 right-0 bg-[#3c3c3e] rounded-xl mt-2 p-2 shadow-2xl z-50">
                     {suggestions.list.map(s => (
                       <div key={s} onClick={() => applySuggestion(s)} className="p-2 hover:bg-white/10 rounded-lg cursor-pointer text-sm font-medium">{s}</div>
                     ))}
                   </div>
                )}
              </div>
            </div>

            <button 
              onClick={addViaStation}
              className="flex items-center text-sm font-semibold text-[#00BFFF] hover:text-white mt-6 ml-[52px] active:scale-95 transition-all bg-[#00BFFF]/10 px-4 py-2 rounded-full"
            >
              <Plus size={16} className="mr-2" strokeWidth={3} /> Add Intermediate Stop
            </button>
          </div>

          {routeResult && !isCalculating && (
            <div className="mt-6 p-6 bg-gradient-to-br from-blue-900/30 to-purple-900/20 border border-blue-500/20 rounded-[32px] animate-in zoom-in-95 fade-in slide-in-from-bottom-8 duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Calculated Route</h3>
                <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">{routeResult.stations.length} Stops</span>
              </div>
              <div className="flex space-x-6">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Time</p>
                  <p className="text-2xl font-bold">{routeResult.duration}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Fare</p>
                  <p className="text-2xl font-bold">{routeResult.fare}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Changes</p>
                  <p className="text-2xl font-bold">{routeResult.interchanges}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  onSaveJourney(routeResult);
                  showToast("Journey saved to Passport!");
                  setRouteResult(null);
                  setStartStation(''); setEndStation(''); setViaStations([]);
                  onRouteCalculated(null);
                }}
                className="w-full mt-6 bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all shadow-lg"
              >
                Complete & Save Trip
              </button>
            </div>
          )}

          {!routeResult && (
            <button 
              onClick={calculateRoute}
              disabled={isCalculating}
              className={`w-full mt-8 font-bold py-4 rounded-[20px] shadow-lg transition-all duration-300 flex justify-center items-center group ${
                isCalculating 
                ? 'bg-[#2c2c2e] text-gray-400 cursor-wait' 
                : 'bg-gradient-to-r from-[#00BFFF] to-[#3b82f6] text-white hover:opacity-90 active:scale-[0.98]'
              }`}
            >
              {isCalculating ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Plotting Route...</span>
                </div>
              ) : (
                <>
                  <Navigation size={20} className="mr-2 group-hover:translate-x-1 transition-transform" /> 
                  Show Routes
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PassportTab({ showToast, stats }) {
  const getBadges = () => {
    let unlocked = 0;
    if (stats.distance > 10) unlocked++;
    if (stats.distance > 50) unlocked++;
    if (stats.lines.length > 2) unlocked++;
    if (stats.stations > 5) unlocked++;
    return unlocked;
  };

  return (
    <div className="w-full h-full flex flex-col justify-start pt-16 px-6 pointer-events-auto overflow-y-auto no-scrollbar pb-32 animate-in fade-in duration-700 bg-[#050505]">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-white/95">Passport</h1>
        <div className="flex space-x-4 items-center">
          <button onClick={() => showToast("Preparing sharing link...")} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all">
            <Share size={18} />
          </button>
          <button onClick={() => showToast("Profile settings")} className="w-12 h-12 rounded-full bg-gray-600 overflow-hidden border-2 border-white/20 active:scale-95 transition-transform shadow-lg">
             <div className="w-full h-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-pulse-slow"></div>
          </button>
        </div>
      </div>

      <div className="mb-8">
         <button onClick={() => showToast("Filter applied: All-Time")} className="bg-[#2c2c2e] hover:bg-[#3c3c3e] border border-white/5 px-5 py-2.5 rounded-full text-sm font-bold active:scale-95 transition-all shadow-sm">
           All-Time
         </button>
      </div>

      <div className="space-y-5">
        
        {/* Main Stats Card */}
        <div className="bg-gradient-to-br from-[#1E1B4B] via-[#2E1065] to-[#0A0B26] rounded-[32px] p-7 shadow-2xl relative overflow-hidden border border-white/10 group cursor-pointer" onClick={() => showToast("Opening detailed stats...")}>
           <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <h2 className="text-sm font-bold tracking-widest text-white/90 uppercase flex items-center">
                  ALL-TIME METRO PASSPORT
                </h2>
                <p className="text-[10px] text-white/50 font-mono mt-1 tracking-widest">🎟 DEL • METRO • YATRA</p>
              </div>
              <Share size={20} className="text-white/60 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); showToast("Shared passport!"); }} />
           </div>

           <div className="grid grid-cols-2 gap-y-8 gap-x-4 mb-10 relative z-10">
              <div>
                <p className="text-[11px] font-bold text-white/50 tracking-wider uppercase mb-1">Journeys</p>
                <div className="text-5xl font-bold tracking-tighter">{stats.trips}</div>
                {stats.trips > 2 && <p className="text-xs text-[#00BFFF] mt-1 font-semibold">Active Rider</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold text-white/50 tracking-wider uppercase mb-1">Distance</p>
                <div className="text-5xl font-bold tracking-tighter">{stats.distance}</div>
                <p className="text-xs text-white/60 mt-1 font-semibold">km logged</p>
              </div>
              
              <div>
                <p className="text-[11px] font-bold text-white/50 tracking-wider uppercase mb-1">Unique Stations</p>
                <div className="text-2xl font-bold">{stats.stations}</div>
              </div>
              <div>
                 <p className="text-[11px] font-bold text-white/50 tracking-wider uppercase mb-1">Lines Explored</p>
                 <div className="text-2xl font-bold">{stats.lines.length}</div>
              </div>
           </div>

           <button className="w-full bg-white/10 group-hover:bg-white/20 active:bg-white/30 transition-all duration-300 py-4 rounded-2xl flex justify-between items-center px-5 backdrop-blur-sm relative z-10">
              <span className="font-bold text-sm">All Travel Stats</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
           </button>
           
           <div className="absolute -bottom-12 -right-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700">
              <TrainFront size={250} />
           </div>
        </div>

        {/* Gamification Card */}
        <div className="bg-gradient-to-br from-[#7F1D1D] to-[#450A0A] rounded-[32px] p-7 shadow-2xl relative overflow-hidden border border-white/5 group cursor-pointer" onClick={() => showToast("Opening achievement logic...")}>
           <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="text-7xl font-bold text-white tracking-tighter">{getBadges()}</div>
              <Share size={20} className="text-white/60 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); showToast("Shared achievement!"); }} />
           </div>
           <div className="relative z-10 mb-8">
              <p className="text-xl font-bold text-white leading-tight">badges unlocked</p>
              <p className="text-sm text-red-200/80 mt-1 font-medium">Keep riding to unlock 'Master Commuter'</p>
           </div>
           
           <button className="w-full bg-black/20 group-hover:bg-black/30 active:bg-black/40 transition-all duration-300 py-4 rounded-2xl flex justify-between items-center px-5 backdrop-blur-sm relative z-10">
              <span className="font-bold text-sm text-red-100">All Badges & Rewards</span>
              <ArrowRight size={18} className="text-red-100 group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="fixed top-12 left-0 right-0 flex justify-center z-[100] pointer-events-none">
      <div className="bg-[#2c2c2e] text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 flex items-center space-x-3 animate-in slide-in-from-top-10 fade-in duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]">
        <CheckCircle2 size={18} className="text-green-400" />
        <span className="font-medium text-sm">{message}</span>
      </div>
    </div>
  );
}