import React from "react";

export function TransportHeroIllustration() {
  return (
    <svg viewBox="0 0 520 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-md max-h-64 object-contain">
      <defs>
        <linearGradient id="skyGradT" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#eff6ff" stopOpacity="0.2"/>
        </linearGradient>
        <linearGradient id="busGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="glassGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>
      </defs>

      {/* Sky & City Silhouette */}
      <rect width="520" height="280" rx="20" fill="url(#skyGradT)"/>
      <path d="M40 210 L40 110 L90 110 L90 210 Z" fill="#93c5fd" opacity="0.4"/>
      <path d="M100 210 L100 80 L160 80 L160 210 Z" fill="#60a5fa" opacity="0.3"/>
      <path d="M180 210 L180 130 L230 130 L230 210 Z" fill="#93c5fd" opacity="0.35"/>
      <path d="M370 210 L370 95 L430 95 L430 210 Z" fill="#60a5fa" opacity="0.35"/>
      <path d="M440 210 L440 120 L490 120 L490 210 Z" fill="#93c5fd" opacity="0.4"/>

      {/* Trees */}
      <circle cx="260" cy="190" r="22" fill="#10b981" opacity="0.7"/>
      <circle cx="280" cy="195" r="18" fill="#059669" opacity="0.75"/>
      <circle cx="340" cy="192" r="24" fill="#10b981" opacity="0.7"/>

      {/* Road & Pavement */}
      <rect x="0" y="210" width="520" height="70" fill="#cbd5e1"/>
      <line x1="20" y1="245" x2="500" y2="245" stroke="#ffffff" strokeWidth="4" strokeDasharray="18 12"/>
      <rect x="0" y="200" width="520" height="12" fill="#e2e8f0"/>

      {/* Modern Indian Public Bus */}
      <g transform="translate(70, 115)">
        {/* Bus Body */}
        <rect x="10" y="20" width="260" height="80" rx="14" fill="url(#busGrad)" stroke="#1e3a8a" strokeWidth="2"/>
        {/* Destination Board */}
        <rect x="35" y="24" width="70" height="10" rx="3" fill="#0f172a"/>
        <rect x="42" y="27" width="56" height="4" rx="2" fill="#38bdf8"/>
        {/* Roof AC unit */}
        <rect x="90" y="14" width="90" height="8" rx="3" fill="#94a3b8"/>
        {/* Windows */}
        <rect x="25" y="38" width="45" height="32" rx="4" fill="url(#glassGrad)"/>
        <rect x="75" y="38" width="45" height="32" rx="4" fill="url(#glassGrad)"/>
        <rect x="125" y="38" width="45" height="32" rx="4" fill="url(#glassGrad)"/>
        <rect x="175" y="38" width="45" height="32" rx="4" fill="url(#glassGrad)"/>
        {/* Passenger Silhouettes */}
        <circle cx="48" cy="50" r="5" fill="#334155" opacity="0.6"/>
        <circle cx="98" cy="50" r="5" fill="#334155" opacity="0.6"/>
        <circle cx="148" cy="50" r="5" fill="#334155" opacity="0.6"/>
        {/* Front windshield */}
        <path d="M225 38 L258 45 L258 70 L225 70 Z" fill="url(#glassGrad)"/>
        {/* Driver */}
        <circle cx="240" cy="54" r="5" fill="#334155"/>
        {/* Headlights */}
        <rect x="260" y="75" width="10" height="10" rx="2" fill="#fef08a"/>
        {/* Wheels */}
        <circle cx="65" cy="100" r="18" fill="#1e293b"/>
        <circle cx="65" cy="100" r="8" fill="#94a3b8"/>
        <circle cx="225" cy="100" r="18" fill="#1e293b"/>
        <circle cx="225" cy="100" r="8" fill="#94a3b8"/>
      </g>

      {/* Modern Bus Stop Shelter */}
      <g transform="translate(360, 140)">
        <path d="M10 20 L100 5 L105 10 L15 25 Z" fill="#0284c7"/>
        <line x1="25" y1="22" x2="25" y2="72" stroke="#64748b" strokeWidth="5"/>
        <line x1="90" y1="12" x2="90" y2="72" stroke="#64748b" strokeWidth="5"/>
        <rect x="30" y="45" width="55" height="8" rx="2" fill="#94a3b8"/>
        <rect x="25" y="24" width="65" height="20" fill="#e0f2fe" opacity="0.5"/>
        {/* Waiting Commuter */}
        <circle cx="50" cy="38" r="6" fill="#0284c7"/>
        <path d="M44 46 L56 46 L54 62 L46 62 Z" fill="#0369a1"/>
      </g>
    </svg>
  );
}

export function MunicipalHeroIllustration() {
  return (
    <svg viewBox="0 0 520 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-md max-h-64 object-contain">
      <defs>
        <linearGradient id="skyGradM" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dcfce7" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#f0fdf4" stopOpacity="0.2"/>
        </linearGradient>
        <linearGradient id="truckGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Sky & City Silhouette */}
      <rect width="520" height="280" rx="20" fill="url(#skyGradM)"/>
      <path d="M30 210 L30 130 L75 130 L75 210 Z" fill="#86efac" opacity="0.35"/>
      <path d="M85 210 L85 90 L140 90 L140 210 Z" fill="#4ade80" opacity="0.3"/>
      <path d="M150 210 L150 140 L195 140 L195 210 Z" fill="#86efac" opacity="0.35"/>

      {/* Urban Park & Trees */}
      <path d="M0 200 Q 120 180 240 200 L 240 210 L 0 210 Z" fill="#bbf7d0" opacity="0.6"/>
      <circle cx="70" cy="180" r="24" fill="#22c55e" opacity="0.8"/>
      <circle cx="110" cy="175" r="28" fill="#16a34a" opacity="0.85"/>
      <circle cx="150" cy="182" r="22" fill="#22c55e" opacity="0.8"/>

      {/* Road & Pavement */}
      <rect x="0" y="210" width="520" height="70" fill="#cbd5e1"/>
      <line x1="20" y1="245" x2="500" y2="245" stroke="#ffffff" strokeWidth="4" strokeDasharray="18 12"/>
      <rect x="0" y="200" width="520" height="12" fill="#e2e8f0"/>

      {/* Smart Solar Streetlight */}
      <g transform="translate(390, 70)">
        <line x1="20" y1="135" x2="20" y2="30" stroke="#475569" strokeWidth="4"/>
        <path d="M20 30 Q 20 10 40 10 L 50 10" stroke="#475569" strokeWidth="4" fill="none"/>
        <rect x="35" y="8" width="20" height="6" rx="2" fill="#3b82f6"/>
        <ellipse cx="45" cy="18" rx="8" ry="4" fill="#fef08a"/>
      </g>

      {/* Municipal Waste Management Vehicle */}
      <g transform="translate(230, 125)">
        {/* Tipper Container */}
        <rect x="10" y="25" width="140" height="70" rx="8" fill="url(#truckGrad)" stroke="#047857" strokeWidth="2"/>
        {/* Recycle Logo on Vehicle */}
        <circle cx="80" cy="60" r="18" fill="#ffffff" opacity="0.25"/>
        <path d="M75 52 L85 52 L80 60 Z M83 60 L88 68 L78 68 Z M74 65 L69 58 L77 58 Z" fill="#ffffff"/>
        {/* Cab */}
        <path d="M150 45 L185 45 L195 65 L195 95 L150 95 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2"/>
        <rect x="155" y="50" width="25" height="22" rx="3" fill="#bae6fd"/>
        {/* Driver */}
        <circle cx="168" cy="60" r="5" fill="#334155"/>
        {/* Headlight */}
        <rect x="190" y="78" width="6" height="8" rx="2" fill="#fef08a"/>
        {/* Wheels */}
        <circle cx="45" cy="98" r="16" fill="#1e293b"/>
        <circle cx="45" cy="98" r="7" fill="#94a3b8"/>
        <circle cx="115" cy="98" r="16" fill="#1e293b"/>
        <circle cx="115" cy="98" r="7" fill="#94a3b8"/>
        <circle cx="175" cy="98" r="16" fill="#1e293b"/>
        <circle cx="175" cy="98" r="7" fill="#94a3b8"/>
      </g>
    </svg>
  );
}

export function HealthcareHeroIllustration() {
  return (
    <svg viewBox="0 0 520 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-md max-h-64 object-contain">
      <defs>
        <linearGradient id="skyGradH" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe4e6" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#fff1f2" stopOpacity="0.2"/>
        </linearGradient>
        <linearGradient id="hospGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
      </defs>

      {/* Sky & Background */}
      <rect width="520" height="280" rx="20" fill="url(#skyGradH)"/>

      {/* Background Trees */}
      <circle cx="60" cy="180" r="26" fill="#10b981" opacity="0.6"/>
      <circle cx="460" cy="180" r="28" fill="#059669" opacity="0.6"/>

      {/* Hospital Building */}
      <g transform="translate(140, 50)">
        <rect x="20" y="20" width="230" height="150" rx="8" fill="url(#hospGrad)" stroke="#e2e8f0" strokeWidth="2"/>
        {/* Upper Sign */}
        <rect x="65" y="28" width="140" height="22" rx="4" fill="#e11d48"/>
        {/* Red Cross */}
        <rect x="75" y="34" width="10" height="10" fill="#ffffff" rx="2"/>
        <path d="M78 36 H82 V42 H78 Z M76 38 H84 V40 H76 Z" fill="#e11d48"/>
        <text x="95" y="44" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="sans-serif">HOSPITAL</text>
        {/* Grid Windows */}
        {[0, 1, 2, 3].map((row) => (
          <g key={row} transform={`translate(0, ${row * 24})`}>
            <rect x="35" y="60" width="22" height="15" rx="2" fill="#93c5fd" opacity="0.8"/>
            <rect x="70" y="60" width="22" height="15" rx="2" fill="#93c5fd" opacity="0.8"/>
            <rect x="105" y="60" width="22" height="15" rx="2" fill="#93c5fd" opacity="0.8"/>
            <rect x="140" y="60" width="22" height="15" rx="2" fill="#93c5fd" opacity="0.8"/>
            <rect x="175" y="60" width="22" height="15" rx="2" fill="#93c5fd" opacity="0.8"/>
            <rect x="210" y="60" width="22" height="15" rx="2" fill="#93c5fd" opacity="0.8"/>
          </g>
        ))}
        {/* Glass Entrance Door */}
        <rect x="110" y="140" width="45" height="30" rx="2" fill="#38bdf8" opacity="0.9"/>
      </g>

      {/* Road & Forecourt */}
      <rect x="0" y="210" width="520" height="70" fill="#cbd5e1"/>
      <line x1="20" y1="245" x2="500" y2="245" stroke="#ffffff" strokeWidth="4" strokeDasharray="18 12"/>
      <rect x="0" y="200" width="520" height="12" fill="#e2e8f0"/>

      {/* Emergency Ambulance */}
      <g transform="translate(30, 140)">
        <rect x="10" y="20" width="95" height="45" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5"/>
        <path d="M105 35 L125 35 L135 50 L135 65 L105 65 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5"/>
        {/* Red emergency stripe */}
        <rect x="10" y="42" width="120" height="8" fill="#e11d48"/>
        {/* Red cross on ambulance */}
        <rect x="45" y="25" width="14" height="14" rx="2" fill="#ffffff"/>
        <path d="M50 27 H54 V37 H50 Z M47 30 H57 V34 H47 Z" fill="#e11d48"/>
        {/* Windows */}
        <rect x="105" y="38" width="18" height="12" rx="2" fill="#bae6fd"/>
        {/* Emergency Beacon */}
        <rect x="50" y="15" width="12" height="5" rx="2" fill="#ef4444"/>
        {/* Wheels */}
        <circle cx="35" cy="68" r="12" fill="#1e293b"/>
        <circle cx="35" cy="68" r="5" fill="#94a3b8"/>
        <circle cx="115" cy="68" r="12" fill="#1e293b"/>
        <circle cx="115" cy="68" r="5" fill="#94a3b8"/>
      </g>
    </svg>
  );
}
