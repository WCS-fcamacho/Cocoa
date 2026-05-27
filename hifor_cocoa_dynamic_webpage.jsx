import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Pause, Map, CloudRain, Sprout, PackageCheck, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { geoMercator, geoPath } from "d3-geo";
import { feature as topojsonFeature } from "topojson-client";

const WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const steps = [
  {
    id: 0,
    eyebrow: "01 / Forest system",
    title: "Congo Basin: High-Integrity Forests",
    subtitle: "A climate system that helps sustain rainfall far beyond its borders.",
    icon: Map,
    focus: "congo",
    note: "High-integrity forest landscapes",
  },
  {
    id: 1,
    eyebrow: "02 / Atmospheric connection",
    title: "Moisture Flows Across Africa",
    subtitle: "Intact tropical forests recycle moisture into the atmosphere and influence rainfall downwind.",
    icon: CloudRain,
    focus: "flows",
    note: "Rainfall teleconnections",
  },
  {
    id: 2,
    eyebrow: "03 / Cocoa landscapes",
    title: "Arrival in Côte d’Ivoire & Ghana",
    subtitle: "Rainfall stability supports cocoa-producing landscapes in West Africa.",
    icon: Sprout,
    focus: "cocoa",
    note: "Cocoa production belt",
  },
  {
    id: 3,
    eyebrow: "04 / Supply chains",
    title: "From Forest Rainfall to Cocoa Supply Chains",
    subtitle: "Climate stability in high-integrity forests underpins economic systems far away.",
    icon: PackageCheck,
    focus: "supply",
    note: "Supply-chain resilience",
  },
];

const projectionSettings = {
  congo: { center: [18, 0], scale: 500, translate: [540, 315] },
  flows: { center: [10, 2], scale: 520, translate: [540, 315] },
  cocoa: { center: [-3.2, 6.6], scale: 1280, translate: [560, 315] },
  supply: { center: [-2.2, 6.2], scale: 980, translate: [525, 315] },
};

const congoCountryNames = [
  "democratic republic of the congo",
  "dem. rep. congo",
  "drc",
  "congo",
  "republic of the congo",
  "gabon",
  "cameroon",
  "central african republic",
  "equatorial guinea",
];

const cocoaCountryNames = ["cote d'ivoire", "côte d’ivoire", "côte d'ivoire", "ivory coast", "ghana"];

const forestMass = {
  type: "Feature",
  properties: { name: "Approximate Congo Basin forest mass" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [8.5, 4.5],
        [12.5, 6.6],
        [18, 6.4],
        [24, 4.3],
        [29.5, 1.2],
        [29.6, -3.7],
        [25.5, -7.7],
        [19.4, -8.9],
        [13.5, -6.7],
        [9.3, -3.6],
        [7.7, 0.4],
        [8.5, 4.5],
      ],
    ],
  },
};

const hiforCore = {
  type: "Feature",
  properties: { name: "Illustrative HIFOR core area" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [12.2, 3.7],
        [16.4, 5.3],
        [22.3, 4.3],
        [27.1, 1.0],
        [27.4, -2.5],
        [24.2, -5.7],
        [19.1, -7.3],
        [14.3, -5.5],
        [11.6, -2.0],
        [10.7, 1.2],
        [12.2, 3.7],
      ],
    ],
  },
};

const flowLines = [
  [[25, 0], [20, 1.7], [14, 3.8], [7, 5.8], [0, 6.4], [-5.5, 6.2]],
  [[23, -1.6], [18, 0.1], [12, 2.6], [6, 4.8], [0, 5.5], [-5.3, 5.2]],
  [[27, 2.2], [22, 3.3], [15, 5.3], [8, 7.3], [1, 7.8], [-5.6, 7.4]],
  [[22, -4.4], [17, -1.3], [11, 1.2], [5, 3.6], [-0.5, 4.6], [-5.6, 4.4]],
].map((coordinates) => ({ type: "Feature", geometry: { type: "LineString", coordinates } }));

const labelPoints = {
  congo: [21.6, -1.8],
  cote: [-5.45, 7.55],
  ghana: [-1.1, 7.75],
  flows: [6.3, 7.6],
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function cleanName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’]/g, "'")
    .toLowerCase();
}

function countryName(feature) {
  return feature?.properties?.name || feature?.properties?.NAME || feature?.properties?.admin || "";
}

function matchesAny(feature, names) {
  const cleaned = cleanName(countryName(feature));
  return names.some((name) => cleaned === cleanName(name) || cleaned.includes(cleanName(name)));
}

function makeGeoLine(coordinates) {
  return { type: "Feature", geometry: { type: "LineString", coordinates } };
}

function ProjectedLabel({ projection, coordinates, children, className = "", dx = 0, dy = 0 }) {
  const point = projection(coordinates);
  if (!point) return null;
  return (
    <text
      x={point[0] + dx}
      y={point[1] + dy}
      className={className}
      fill="rgba(236,254,255,.88)"
      fontSize="15"
      letterSpacing="1.9"
      textAnchor="middle"
      style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.45)", strokeWidth: 3 }}
    >
      {children}
    </text>
  );
}

function MoistureFlow({ path, active }) {
  return (
    <g opacity={active ? 1 : 0.12}>
      <defs>
        <filter id="flowGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="flowGradient" x1="0%" x2="100%">
          <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.08" />
          <stop offset="35%" stopColor="#67E8F9" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#E0FFFF" stopOpacity="0.94" />
        </linearGradient>
      </defs>
      {flowLines.map((line, index) => (
        <motion.path
          key={index}
          d={path(line)}
          fill="none"
          stroke="url(#flowGradient)"
          strokeWidth={index === 1 ? 6.5 : 4.2}
          strokeLinecap="round"
          filter="url(#flowGlow)"
          strokeDasharray="18 27"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: active ? 1 : 0.35,
            opacity: active ? [0.45, 1, 0.6] : 0.12,
            strokeDashoffset: active ? [0, -90] : 0,
          }}
          transition={{ duration: 4.8 + index * 0.25, repeat: active ? Infinity : 0, ease: "linear" }}
        />
      ))}
    </g>
  );
}

function CountryLayer({ countries, path, focus }) {
  return (
    <g>
      {countries.map((country, index) => {
        const isCongoSystem = matchesAny(country, congoCountryNames);
        const isCocoa = matchesAny(country, cocoaCountryNames);
        const activeCongo = ["congo", "flows"].includes(focus) && isCongoSystem;
        const activeCocoa = ["cocoa", "supply"].includes(focus) && isCocoa;
        const d = path(country);
        if (!d) return null;

        return (
          <motion.path
            key={`${countryName(country)}-${index}`}
            d={d}
            fill={
              activeCocoa
                ? "rgba(74, 222, 128, .25)"
                : activeCongo
                ? "rgba(34, 197, 94, .18)"
                : "rgba(15, 23, 42, .76)"
            }
            stroke={activeCocoa || activeCongo ? "rgba(103,232,249,.66)" : "rgba(148,163,184,.16)"}
            strokeWidth={activeCocoa || activeCongo ? 1.4 : 0.5}
            initial={false}
            animate={{ opacity: activeCocoa || activeCongo ? 1 : 0.68 }}
            transition={{ duration: 0.45 }}
          />
        );
      })}
    </g>
  );
}

function AfricaMap({ step, countries, dataStatus }) {
  const focus = steps[step].focus;
  const isFlows = focus === "flows";
  const isCocoa = focus === "cocoa" || focus === "supply";
  const isSupply = focus === "supply";

  const projection = useMemo(() => {
    const settings = projectionSettings[focus];
    return geoMercator().center(settings.center).scale(settings.scale).translate(settings.translate);
  }, [focus]);

  const path = useMemo(() => geoPath(projection), [projection]);

  const congoPoint = projection(labelPoints.congo);
  const flowPoint = projection(labelPoints.flows);

  return (
    <div className="relative h-full min-h-[540px] overflow-hidden rounded-[2rem] border border-cyan-300/10 bg-[#03080b] shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_34%,rgba(45,212,191,.16),transparent_31%),radial-gradient(circle_at_25%_76%,rgba(34,197,94,.09),transparent_34%),linear-gradient(135deg,#020617_0%,#071014_45%,#020617_100%)]" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:42px_42px]" />

      <svg viewBox="0 0 980 620" className="absolute inset-0 h-full w-full">
        <defs>
          <filter id="cyanGlow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="landShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#000" floodOpacity="0.55" />
          </filter>
          <radialGradient id="forestGrad" cx="48%" cy="52%" r="62%">
            <stop offset="0%" stopColor="#052e16" />
            <stop offset="43%" stopColor="#166534" />
            <stop offset="100%" stopColor="#84cc16" stopOpacity="0.46" />
          </radialGradient>
          <radialGradient id="cocoaGrad" cx="50%" cy="50%" r="66%">
            <stop offset="0%" stopColor="#14532d" />
            <stop offset="55%" stopColor="#3f6212" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0.68" />
          </radialGradient>
          <pattern id="forestTexture" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="5" r="1.2" fill="#bbf7d0" opacity="0.13" />
            <circle cx="19" cy="10" r="1" fill="#65a30d" opacity="0.25" />
            <circle cx="11" cy="21" r="1.4" fill="#22c55e" opacity="0.14" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="980" height="620" fill="rgba(2,6,23,.12)" />

        <motion.g key={focus} initial={{ opacity: 0.62 }} animate={{ opacity: 1 }} transition={{ duration: 0.55 }}>
          <CountryLayer countries={countries} path={path} focus={focus} />

          <motion.path
            d={path(forestMass)}
            fill="url(#forestGrad)"
            opacity={focus === "congo" || isFlows ? 0.74 : 0.28}
            filter="url(#landShadow)"
          />
          <motion.path d={path(forestMass)} fill="url(#forestTexture)" opacity={focus === "congo" || isFlows ? 0.72 : 0.25} />
          <motion.path
            d={path(hiforCore)}
            fill="rgba(8,47,73,.08)"
            stroke="#38BDF8"
            strokeWidth={focus === "congo" || isFlows ? 3.5 : 1.3}
            filter="url(#cyanGlow)"
            initial={false}
            animate={{ opacity: focus === "congo" || isFlows ? [0.68, 1, 0.68] : 0.22 }}
            transition={{ duration: 2.8, repeat: Infinity }}
          />

          <motion.path
            d={path(makeGeoLine([[-8, 8], [-3, 7], [0.6, 7.2]]))}
            stroke="#67E8F9"
            strokeWidth="1"
            strokeOpacity={isCocoa ? 0.55 : 0}
            fill="none"
          />

          <MoistureFlow path={path} active={isFlows || isCocoa} />

          <ProjectedLabel projection={projection} coordinates={labelPoints.cote} className="font-medium" dy={isCocoa ? 0 : -900}>
            CÔTE D’IVOIRE
          </ProjectedLabel>
          <ProjectedLabel projection={projection} coordinates={labelPoints.ghana} className="font-medium" dy={isCocoa ? 0 : -900}>
            GHANA
          </ProjectedLabel>
        </motion.g>

        {congoPoint && (focus === "congo" || isFlows) && (
          <motion.g initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <circle cx={congoPoint[0]} cy={congoPoint[1]} r="4" fill="#67E8F9" filter="url(#cyanGlow)" />
            <path d={`M ${congoPoint[0] + 8} ${congoPoint[1]} L ${congoPoint[0] + 150} ${congoPoint[1] - 8}`} stroke="#67E8F9" strokeOpacity="0.64" />
            <text x={congoPoint[0] + 160} y={congoPoint[1] - 13} fill="#A5F3FC" fontSize="15">
              High-integrity forest landscapes
            </text>
          </motion.g>
        )}

        {flowPoint && isFlows && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <circle cx={flowPoint[0]} cy={flowPoint[1]} r="3" fill="#67E8F9" filter="url(#cyanGlow)" />
            <text x={flowPoint[0] - 20} y={flowPoint[1] - 18} fill="#A5F3FC" fontSize="15" textAnchor="end">
              Rainfall teleconnections
            </text>
          </motion.g>
        )}
      </svg>

      <AnimatePresence mode="wait">
        <motion.div
          key={focus}
          className="absolute left-7 top-7 max-w-[380px]"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100/90">
            {steps[step].eyebrow}
          </div>
          <h1 className="max-w-[560px] font-serif text-5xl leading-[0.98] tracking-tight text-white drop-shadow-xl md:text-6xl">
            {steps[step].title}
          </h1>
          <div className="mt-5 h-[2px] w-24 bg-gradient-to-r from-emerald-200 to-cyan-300" />
          <p className="mt-6 max-w-[430px] text-lg leading-7 text-slate-200/86">{steps[step].subtitle}</p>
        </motion.div>
      </AnimatePresence>

      <motion.div
        className="absolute right-7 top-8 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-md"
        animate={{ opacity: isSupply ? 1 : 0.9 }}
      >
        <div className="flex items-center gap-3 text-sm text-cyan-100">
          {React.createElement(steps[step].icon, { className: "h-5 w-5 text-cyan-200" })}
          <span>{steps[step].note}</span>
        </div>
      </motion.div>

      <div className="absolute bottom-5 left-6 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs text-slate-300 backdrop-blur-md">
        <Database className="h-3.5 w-3.5 text-cyan-200" />
        <span>
          Country boundaries: {dataStatus === "loaded" ? "Natural Earth / world-atlas open data" : dataStatus === "loading" ? "loading open data…" : "open data unavailable in preview"}
        </span>
      </div>

      <AnimatePresence>{isSupply && <SupplyChainOverlay />}</AnimatePresence>
      <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-[#020617] via-[#020617]/70 to-transparent" />
    </div>
  );
}

function SupplyChainOverlay() {
  const nodes = [
    { label: "Farms", x: 645, y: 265 },
    { label: "Aggregation", x: 795, y: 330 },
    { label: "Processing", x: 815, y: 455 },
    { label: "Markets", x: 875, y: 540 },
  ];
  const links = [
    "M 645 265 C 700 250, 755 268, 795 330",
    "M 795 330 C 840 365, 850 410, 815 455",
    "M 815 455 C 835 490, 858 512, 875 540",
  ];

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <svg viewBox="0 0 980 620" className="h-full w-full">
        <defs>
          <filter id="supplyGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {links.map((link, index) => (
          <motion.path
            key={link}
            d={link}
            fill="none"
            stroke="#67E8F9"
            strokeWidth="2"
            strokeOpacity="0.72"
            strokeDasharray="10 12"
            filter="url(#supplyGlow)"
            animate={{ strokeDashoffset: [0, -44] }}
            transition={{ duration: 2.3, repeat: Infinity, ease: "linear", delay: index * 0.2 }}
          />
        ))}
        {nodes.map((node, index) => (
          <g key={node.label}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="35"
              fill="rgba(8,47,73,.48)"
              stroke="#67E8F9"
              strokeOpacity="0.58"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.15 }}
            />
            <text x={node.x} y={node.y + 5} fill="#ECFEFF" fontSize="14" textAnchor="middle">
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      <motion.div
        className="absolute bottom-12 left-[8%] flex items-end gap-5"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.7 }}
      >
        <div className="relative h-28 w-20 rounded-[45%] bg-gradient-to-br from-yellow-700 via-amber-800 to-stone-950 shadow-2xl">
          <div className="absolute left-4 top-3 h-20 w-2 rounded-full bg-black/25" />
          <div className="absolute left-9 top-2 h-20 w-2 rounded-full bg-black/20" />
        </div>
        <div className="h-24 w-28 rounded-[50%] border border-white/10 bg-gradient-to-br from-stone-100 via-stone-300 to-amber-900 shadow-2xl" />
        <div className="mb-1 rounded-full border border-amber-200/10 bg-amber-950/80 px-5 py-4 text-amber-100 shadow-2xl">
          cocoa beans
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-14 right-[12%] rounded-xl border border-white/10 bg-[#17110f] px-7 py-8 text-center shadow-2xl"
        initial={{ y: 25, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.7 }}
      >
        <div className="text-xs uppercase tracking-[0.4em] text-amber-100/70">Fine</div>
        <div className="mt-2 text-lg uppercase tracking-[0.28em] text-amber-50">Chocolate</div>
        <div className="mt-2 text-xs text-amber-100/50">70% cocoa</div>
      </motion.div>
    </motion.div>
  );
}

function StepTimeline({ step, setStep }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((s, index) => {
        const Icon = s.icon;
        return (
          <button
            key={s.id}
            onClick={() => setStep(index)}
            className={cx(
              "group rounded-2xl border p-4 text-left transition-all duration-300",
              index === step
                ? "border-cyan-300/45 bg-cyan-300/10 shadow-lg shadow-cyan-950/40"
                : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <Icon className={cx("h-5 w-5", index === step ? "text-cyan-200" : "text-slate-400")} />
              <span className="text-xs text-slate-500">0{index + 1}</span>
            </div>
            <div className="text-sm font-medium text-slate-100">{s.title}</div>
            <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{s.subtitle}</div>
          </button>
        );
      })}
    </div>
  );
}

export default function HiforCocoaDynamicWebpage() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [countries, setCountries] = useState([]);
  const [dataStatus, setDataStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      try {
        setDataStatus("loading");
        const response = await fetch(WORLD_ATLAS_URL);
        if (!response.ok) throw new Error("Could not load world-atlas data");
        const topology = await response.json();
        const geojson = topojsonFeature(topology, topology.objects.countries);
        if (!cancelled) {
          setCountries(geojson.features || []);
          setDataStatus("loaded");
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setDataStatus("error");
      }
    }

    loadCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % steps.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [playing]);

  const next = () => setStep((current) => (current + 1) % steps.length);
  const prev = () => setStep((current) => (current - 1 + steps.length) % steps.length);

  return (
    <main className="min-h-screen bg-[#020617] p-4 text-white md:p-7">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.32em] text-cyan-200/70">
              London Climate Action Week · geospatial prototype
            </div>
            <h2 className="font-serif text-3xl tracking-tight text-white md:text-5xl">
              HIFOR rainfall and cocoa supply chains
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              This version uses real open country boundaries and keeps the cinematic animation style for the story from Congo Basin forests to West African cocoa landscapes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={prev}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setPlaying((value) => !value)}>
              {playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {playing ? "Pause" : "Play"}
            </Button>
            <Button className="bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={next}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </header>

        <Card className="overflow-hidden border-white/10 bg-white/[0.025] shadow-2xl">
          <CardContent className="p-3 md:p-4">
            <AfricaMap step={step} countries={countries} dataStatus={dataStatus} />
          </CardContent>
        </Card>

        <div className="mt-5">
          <StepTimeline step={step} setStep={setStep} />
        </div>

        <footer className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm leading-6 text-slate-300">
          <span className="text-cyan-100">Prototype note:</span> the boundaries now come from open Natural Earth-derived world-atlas data. The HIFOR forest mass and moisture-flow paths remain illustrative overlays; those can be replaced with your FLII/HIFOR polygons, GEE exports, or ArcGIS Online feature layers for a production keynote version.
        </footer>
      </div>
    </main>
  );
}
