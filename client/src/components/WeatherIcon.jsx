import { useId } from 'react';

// Sun Icon
function SunIcon({ isNight = false, uniqueId = '' }) {
  if (isNight) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full weather-icon-svg">
        <defs>
          <radialGradient id={`moonGlow-${uniqueId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-orange)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent-orange)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`moonGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>
        {/* Stars */}
        <circle cx="10" cy="12" r="2" className="weather-star" />
        <circle cx="54" cy="10" r="1.5" className="weather-star" />
        <circle cx="52" cy="52" r="2" className="weather-star" />
        <circle cx="8" cy="48" r="1.5" className="weather-star" />
        {/* Moon glow */}
        <circle cx="32" cy="32" r="28" fill={`url(#moonGlow-${uniqueId})`} />
        {/* Moon */}
        <circle cx="32" cy="32" r="20" fill={`url(#moonGrad-${uniqueId})`} />
        <circle cx="42" cy="32" r="17" fill="var(--bg-primary)" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className="w-full h-full weather-icon-svg">
      <defs>
        <radialGradient id={`sunGlow-${uniqueId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent-orange)" stopOpacity="0.5" />
          <stop offset="70%" stopColor="var(--accent-orange)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--accent-orange)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`sunGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* Sun glow */}
      <circle cx="32" cy="32" r="30" fill={`url(#sunGlow-${uniqueId})`} />
      {/* Sun rays */}
      <g className="weather-sun-rays">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <line
            key={i}
            x1="32"
            y1="6"
            x2="32"
            y2="14"
            stroke="var(--accent-orange)"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${angle} 32 32)`}
          />
        ))}
      </g>
      {/* Sun circle */}
      <circle cx="32" cy="32" r="16" fill={`url(#sunGrad-${uniqueId})`} />
    </svg>
  );
}

// Cloud Icon
function CloudIcon({ isNight = false }) {
  const cloudColor = isNight ? '#64748b' : '#94a3b8';
  const cloudHighlight = isNight ? '#475569' : '#cbd5e1';
  return (
    <g>
      <ellipse cx="28" cy="42" rx="16" ry="11" fill={cloudColor} />
      <ellipse cx="44" cy="40" rx="14" ry="10" fill={cloudColor} />
      <ellipse cx="20" cy="45" rx="10" ry="7" fill={cloudColor} />
      <circle cx="26" cy="36" r="10" fill={cloudHighlight} />
      <circle cx="40" cy="34" r="12" fill={cloudHighlight} />
    </g>
  );
}

// Cloudy Icon
function CloudyIcon({ isNight = false, uniqueId = '' }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full weather-icon-svg">
      <defs>
        <linearGradient id={`cloudyGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isNight ? '#94a3b8' : '#e2e8f0'} />
          <stop offset="100%" stopColor={isNight ? '#64748b' : '#94a3b8'} />
        </linearGradient>
        <linearGradient id={`cloudySunGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={`cloudyMoonGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      {isNight ? (
        <>
          <circle cx="50" cy="16" r="10" fill={`url(#cloudyMoonGrad-${uniqueId})`} />
          <circle cx="56" cy="16" r="8" fill="var(--bg-primary)" />
        </>
      ) : (
        <>
          <circle cx="50" cy="18" r="12" fill={`url(#cloudySunGrad-${uniqueId})`} />
        </>
      )}
      <ellipse cx="26" cy="42" rx="18" ry="12" fill={`url(#cloudyGrad-${uniqueId})`} />
      <ellipse cx="42" cy="40" rx="14" ry="10" fill={`url(#cloudyGrad-${uniqueId})`} />
      <ellipse cx="18" cy="44" rx="10" ry="7" fill={isNight ? '#64748b' : '#94a3b8'} />
      <circle cx="24" cy="35" r="11" fill={isNight ? '#94a3b8' : '#e2e8f0'} />
      <circle cx="38" cy="33" r="13" fill={isNight ? '#94a3b8' : '#e2e8f0'} />
    </svg>
  );
}

// Rainy Icon
function RainyIcon({ isNight = false, uniqueId = '' }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full weather-icon-svg">
      <defs>
        <linearGradient id={`rainyCloudGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isNight ? '#64748b' : '#94a3b8'} />
          <stop offset="100%" stopColor={isNight ? '#475569' : '#64748b'} />
        </linearGradient>
        <linearGradient id={`rainDropGrad-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {isNight ? (
        <>
          <circle cx="50" cy="12" r="8" fill="#e2e8f0" />
          <circle cx="55" cy="12" r="6" fill="var(--bg-primary)" />
        </>
      ) : (
        <>
          <circle cx="50" cy="14" r="10" fill="#fcd34d" />
        </>
      )}
      <ellipse cx="24" cy="32" rx="16" ry="10" fill={`url(#rainyCloudGrad-${uniqueId})`} />
      <ellipse cx="38" cy="30" rx="12" ry="9" fill={`url(#rainyCloudGrad-${uniqueId})`} />
      <ellipse cx="16" cy="34" rx="9" ry="6" fill={isNight ? '#475569' : '#64748b'} />
      <circle cx="22" cy="26" r="9" fill={isNight ? '#64748b' : '#94a3b8'} />
      <circle cx="34" cy="24" r="11" fill={isNight ? '#64748b' : '#94a3b8'} />
      {/* Rain drops */}
      {[16, 28, 40].map((x, i) => (
        <g key={i}>
          <path
            d={`M ${x} 46 Q ${x - 1} 52 ${x - 2} 56`}
            stroke={`url(#rainDropGrad-${uniqueId})`}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            className="weather-rain-drop"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        </g>
      ))}
    </svg>
  );
}

// Cold/Snowy Icon
function ColdIcon({ isNight = false, uniqueId = '' }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full weather-icon-svg">
      <defs>
        <linearGradient id={`snowCloudGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isNight ? '#64748b' : '#94a3b8'} />
          <stop offset="100%" stopColor={isNight ? '#475569' : '#64748b'} />
        </linearGradient>
        <radialGradient id={`snowflakeGrad-${uniqueId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#bae6fd" />
        </radialGradient>
      </defs>
      {isNight && (
        <>
          <circle cx="50" cy="12" r="8" fill="#e2e8f0" />
          <circle cx="55" cy="12" r="6" fill="var(--bg-primary)" />
        </>
      )}
      <ellipse cx="24" cy="30" rx="16" ry="10" fill={`url(#snowCloudGrad-${uniqueId})`} />
      <ellipse cx="38" cy="28" rx="12" ry="9" fill={`url(#snowCloudGrad-${uniqueId})`} />
      <ellipse cx="16" cy="32" rx="9" ry="6" fill={isNight ? '#475569' : '#64748b'} />
      <circle cx="22" cy="24" r="9" fill={isNight ? '#64748b' : '#94a3b8'} />
      <circle cx="34" cy="22" r="11" fill={isNight ? '#64748b' : '#94a3b8'} />
      {/* Snowflakes */}
      {[
        { x: 14, y: 46 },
        { x: 28, y: 50 },
        { x: 42, y: 44 }
      ].map((pos, i) => (
        <g key={i} className="weather-snowflake" style={{ animationDelay: `${i * 0.3}s` }}>
          <circle cx={pos.x} cy={pos.y} r="4" fill={`url(#snowflakeGrad-${uniqueId})`} />
          {/* Snowflake arms */}
          {[0, 60, 120].map((angle, j) => (
            <line
              key={j}
              x1={pos.x}
              y1={pos.y - 4}
              x2={pos.x}
              y2={pos.y + 4}
              stroke="#e0f2fe"
              strokeWidth="1.5"
              strokeLinecap="round"
              transform={`rotate(${angle} ${pos.x} ${pos.y})`}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

// Windy Icon
function WindyIcon({ isNight = false, uniqueId = '' }) {
  const windColor = isNight ? 'var(--text-secondary)' : 'var(--text-muted)';
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full weather-icon-svg">
      <defs>
        <linearGradient id={`windySunGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={`windyMoonGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      {isNight ? (
        <>
          <circle cx="48" cy="14" r="10" fill={`url(#windyMoonGrad-${uniqueId})`} />
          <circle cx="54" cy="14" r="8" fill="var(--bg-primary)" />
        </>
      ) : (
        <>
          <circle cx="48" cy="16" r="12" fill={`url(#windySunGrad-${uniqueId})`} />
        </>
      )}
      {/* Wind lines */}
      <path
        d="M 6 30 Q 20 26 32 30 T 52 28"
        stroke={windColor}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        className="weather-wind-line"
      />
      <path
        d="M 10 40 Q 24 36 36 40 T 56 38"
        stroke={windColor}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        className="weather-wind-line"
        style={{ animationDelay: '0.2s' }}
      />
      <path
        d="M 8 50 Q 22 46 34 50 T 58 48"
        stroke={windColor}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        className="weather-wind-line"
        style={{ animationDelay: '0.4s' }}
      />
    </svg>
  );
}

// Clear Night Icon
function ClearIcon({ isNight = false, uniqueId = '' }) {
  if (isNight) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full weather-icon-svg">
        <defs>
          <radialGradient id={`moonGlowClear-${uniqueId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-orange)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent-orange)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`moonGradClear-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>
        {/* Stars */}
        {[
          { x: 10, y: 14, r: 2 },
          { x: 20, y: 52, r: 1.5 },
          { x: 54, y: 10, r: 2 },
          { x: 56, y: 48, r: 1.5 },
          { x: 8, y: 36, r: 1.5 }
        ].map((star, i) => (
          <circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.r}
            className="weather-star"
          />
        ))}
        {/* Moon glow */}
        <circle cx="32" cy="32" r="28" fill={`url(#moonGlowClear-${uniqueId})`} />
        {/* Moon */}
        <circle cx="32" cy="32" r="20" fill={`url(#moonGradClear-${uniqueId})`} />
        <circle cx="42" cy="32" r="17" fill="var(--bg-primary)" />
      </svg>
    );
  }

  return <SunIcon isNight={false} uniqueId={uniqueId} />;
}

// Main WeatherIcon component
function WeatherIcon({ condition, isNight = false, className = '' }) {
  const uniqueId = useId();
  const normalizedCondition = (condition || 'clear').toLowerCase();

  const iconMap = {
    sunny: <SunIcon isNight={isNight} uniqueId={uniqueId} />,
    clear: <ClearIcon isNight={isNight} uniqueId={uniqueId} />,
    cloudy: <CloudyIcon isNight={isNight} uniqueId={uniqueId} />,
    rainy: <RainyIcon isNight={isNight} uniqueId={uniqueId} />,
    cold: <ColdIcon isNight={isNight} uniqueId={uniqueId} />,
    windy: <WindyIcon isNight={isNight} uniqueId={uniqueId} />
  };

  const icon = iconMap[normalizedCondition] || <CloudyIcon isNight={isNight} uniqueId={uniqueId} />;

  return (
    <div className={`weather-icon ${className}`}>
      {icon}
    </div>
  );
}

export default WeatherIcon;
