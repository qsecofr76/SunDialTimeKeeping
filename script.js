// ==========================================
// KRONOS - GNOMONICS & HISTORICAL SHADOWS ENGINE
// ==========================================

// Global State
let state = {
    lat: 45.6669,       // Latitude (Treviso)
    lng: 12.2431,       // Longitude (Treviso)
    decMuro: 0.0,       // Wall Declination (0 = Direct South, + = West, - = East)
    date: new Date(),   // Selected Date
    timeString: "12:00",// Selected Time string
    dst: true,          // Daylight Saving Time active (+1h)
    timezone: 1,        // Central European Time (CET, UTC+1)
    isAnimating: false, // Time animation active
    gnomonLength: 85,   // Length of perpendicular gnomon in pixels (height of nodus)
    humanHeight: 75,    // Height of the human gnomon on the horizontal sundial
    animationSpeed: 30, // Default animation speed (minutes advanced per second)
    lastFrameTime: null
};

// ROMAN NUMERALS for Temporary Hours
const ROMAN_NUMERALS = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
    7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'
};

// MONTH NAMES for Analemma Widget
const MONTH_NAMES = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const MONTH_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

// DOM Elements
const el = {
    latInput: document.getElementById('input-lat'),
    lngInput: document.getElementById('input-lng'),
    decInput: document.getElementById('input-dec'),
    dateInput: document.getElementById('input-date'),
    timeInput: document.getElementById('input-time'),
    dstInput: document.getElementById('input-dst'),
    animateInput: document.getElementById('input-animate'),
    speedInput: document.getElementById('input-speed'),
    speedVal: document.getElementById('speed-val'),
    speedContainer: document.getElementById('speed-control-container'),
    
    latVal: document.getElementById('lat-val'),
    lngVal: document.getElementById('lng-val'),
    decVal: document.getElementById('dec-val'),
    
    solarTimeVal: document.getElementById('solar-time-val'),
    solarDecVal: document.getElementById('solar-dec-val'),
    solarAltVal: document.getElementById('solar-alt-val'),
    solarAziVal: document.getElementById('solar-azi-val'),
    sunRiseSetVal: document.getElementById('sun-rise-set-val'),
    eotVal: document.getElementById('eot-val'),
    
    frenchHourHand: document.getElementById('french-hour'),
    frenchMinHand: document.getElementById('french-min'),
    frenchSecHand: document.getElementById('french-sec'),
    
    svgItalic: document.getElementById('svg-italic'),
    svgBabylonian: document.getElementById('svg-babylonian'),
    svgTemporary: document.getElementById('svg-temporary'),
    svgHorizontal: document.getElementById('svg-horizontal'),
    svgFrenchVertical: document.getElementById('svg-french-vertical'),
    
    msgItalic: document.getElementById('italic-shadow-msg'),
    msgBabylonian: document.getElementById('babylonian-shadow-msg'),
    msgTemporary: document.getElementById('temporary-shadow-msg'),
    msgHorizontal: document.getElementById('horizontal-shadow-msg'),
    msgFrenchVertical: document.getElementById('french-vertical-shadow-msg'),
    
    valItalic: document.getElementById('italic-time-val'),
    valBabylonian: document.getElementById('babylonian-time-val'),
    valTemporary: document.getElementById('temporary-time-val'),
    valHorizontal: document.getElementById('horizontal-time-val'),
    valFrenchVertical: document.getElementById('french-vertical-time-val'),
    
    analemmaDesc: document.getElementById('analemma-desc'),
    
    presetBtns: document.querySelectorAll('.btn-preset'),
    btnCustom: document.getElementById('btn-custom'),
    decPresetBtns: document.querySelectorAll('.btn-dec-preset'),
    gpsContainer: document.getElementById('gps-btn-container'),
    btnGps: document.getElementById('btn-gps')
};

// ==========================================
// MATHEMATICAL & ASTRONOMICAL UTILITIES
// ==========================================

const degToRad = deg => deg * Math.PI / 180;
const radToDeg = rad => rad * 180 / Math.PI;

// Calculate Day of the Year (N: 1 to 366)
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function calcMeanObliquityOfEcliptic(t) {
    const seconds = 21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813));
    return 23.0 + (26.0 + (seconds / 60.0)) / 60.0;
}

function calcObliquityCorrection(t) {
    const e0 = calcMeanObliquityOfEcliptic(t);
    const omega = 125.04 - 1934.136 * t;
    return e0 + 0.00256 * Math.cos(degToRad(omega));
}

function getJulianCenturies(input) {
    let date;
    if (input instanceof Date) {
        date = input;
    } else {
        const year = (typeof state !== 'undefined' && state && state.date) ? state.date.getFullYear() : new Date().getFullYear();
        date = new Date(Date.UTC(year, 0, 1, 12, 0, 0));
        date.setUTCDate(input);
    }
    const epoch = 946728000000; // Date.UTC(2000, 0, 1, 12, 0, 0)
    return (date.getTime() - epoch) / 3155760000000;
}

// Solar Declination (\delta) in Radians
function calcSolarDeclination(input) {
    const t = getJulianCenturies(input);

    let L0 = 280.46646 + t * (36000.76983 + t * 0.0003032);
    L0 = L0 % 360;
    if (L0 < 0) L0 += 360;

    let M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    M = M % 360;
    if (M < 0) M += 360;

    const MRad = degToRad(M);
    const C = (1.914602 - t * (0.004817 + 0.000014 * t)) * Math.sin(MRad) +
              (0.019993 - 0.000101 * t) * Math.sin(2 * MRad) +
              0.000289 * Math.sin(3 * MRad);

    const trueLong = L0 + C;
    const omega = 125.04 - 1934.136 * t;
    const apparentLong = trueLong - 0.00569 - 0.00478 * Math.sin(degToRad(omega));

    const epsilon = calcObliquityCorrection(t);
    const epsRad = degToRad(epsilon);

    return Math.asin(Math.sin(epsRad) * Math.sin(degToRad(apparentLong)));
}

// Equation of Time (EoT) in Minutes
function calcEquationOfTime(input) {
    const t = getJulianCenturies(input);

    let L0 = 280.46646 + t * (36000.76983 + t * 0.0003032);
    L0 = L0 % 360;
    if (L0 < 0) L0 += 360;

    let M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    M = M % 360;
    if (M < 0) M += 360;

    const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

    const epsilon = calcObliquityCorrection(t);
    const epsRad = degToRad(epsilon);
    const y = Math.tan(epsRad / 2) ** 2;

    const L0Rad = degToRad(L0);
    const MRad = degToRad(M);

    const eqTime = 4 * radToDeg(
        y * Math.sin(2 * L0Rad) -
        2 * e * Math.sin(MRad) +
        4 * e * y * Math.sin(MRad) * Math.cos(2 * L0Rad) -
        0.5 * y * y * Math.sin(4 * L0Rad) -
        1.25 * e * e * Math.sin(2 * MRad)
    );

    return eqTime; // in minutes
}

// Calculate Sun position in horizontal coordinates (Altitude, Azimuth)
// Azimuth is 0 at North, positive East (clockwise N -> E -> S -> W)
function getSolarCoordinates(hRad, latRad, decRad) {
    const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hRad);
    const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    
    const cosAlt = Math.cos(altRad);
    let aziRad = 0;
    
    if (cosAlt > 0.0001) {
        const sinAzi = -(Math.cos(decRad) * Math.sin(hRad)) / cosAlt;
        const cosAzi = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * cosAlt);
        aziRad = Math.atan2(sinAzi, cosAzi);
    } else {
        aziRad = hRad;
    }
    if (aziRad < 0) aziRad += 2 * Math.PI;
    return { alt: altRad, azi: aziRad };
}

// Project gnomon shadow onto a vertical wall with declination D
// Gnomon base is at (0, 0)
// Uses direct 3D vector rotation for bulletproof precision
function getShadowCoordinates(altRad, aziRad, decMuroRad, a) {
    // 3D Solar unit vector in South-East-Zenith horizontal coordinate system:
    const sSouth = -Math.cos(altRad) * Math.cos(aziRad);
    const sEast = Math.cos(altRad) * Math.sin(aziRad);
    const sZenith = Math.sin(altRad);
    
    // Project the sun's vector onto the wall basis:
    // Normal to wall (pointing South + D): normal vector = (cos(D), -sin(D), 0)
    const sNormal = sSouth * Math.cos(decMuroRad) - sEast * Math.sin(decMuroRad);
    
    // Horizontal along wall (pointing East/right): horiz vector = (sin(D), cos(D), 0)
    const sHoriz = sSouth * Math.sin(decMuroRad) + sEast * Math.cos(decMuroRad);
    
    // Sun is behind the wall or below the horizon
    if (sNormal <= 0.001 || sZenith <= 0.001) {
        return { x: 0, y: 0, visible: false };
    }
    
    // Shadow coordinates:
    const x = -a * (sHoriz / sNormal);
    const y = -a * (sZenith / sNormal);
    
    return { x, y, visible: true };
}

// Project gnomon shadow onto a horizontal pavement plaza
// Gnomon height is a, base is at (0, 0)
// Uses direct 3D vector rotation for bulletproof precision
function getHorizontalShadowCoordinates(altRad, aziRad, a) {
    const sSouth = -Math.cos(altRad) * Math.cos(aziRad);
    const sEast = Math.cos(altRad) * Math.sin(aziRad);
    const sZenith = Math.sin(altRad);
    
    if (sZenith <= 0.001) {
        return { x: 0, y: 0, visible: false };
    }
    
    const x = -a * (sEast / sZenith);
    const y = a * (sSouth / sZenith);
    
    return { x, y, visible: true };
}
// Convert apparent solar time (0-24) to civil time (0-24)
function solarToCivil(tSolar, dst, eot, lng, tz) {
    const dstOffset = dst ? 1 : 0;
    const lngCorrection = 4 * (lng - 15 * tz) / 60; // in hours
    return tSolar + dstOffset - lngCorrection - (eot / 60);
}
// Format fractional hours into HH:MM:SS
function formatTime(hoursDecimal) {
    let h = Math.floor(hoursDecimal);
    let m = Math.floor((hoursDecimal - h) * 60);
    let s = Math.floor(((hoursDecimal - h) * 60 - m) * 60);
    
    h = (h + 24) % 24;
    
    const pad = n => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ==========================================
// DYNAMIC SUNDIAL LINE GENERATORS
// ==========================================

// Hour lines for Vertical Dials
function getPointsForHourLine(system, H, lat, decMuro, gnomonLength) {
    const points = [];
    const latRad = degToRad(lat);
    const decMuroRad = degToRad(decMuro);
    
    for (let dDeg = -23.44; dDeg <= 23.44; dDeg += 1.5) {
        const dRad = degToRad(dDeg);
        
        const cosHSS = -Math.tan(latRad) * Math.tan(dRad);
        let hSunsetRad = 0;
        if (cosHSS <= -1) {
            hSunsetRad = Math.PI;
        } else if (cosHSS >= 1) {
            hSunsetRad = 0;
        } else {
            hSunsetRad = Math.acos(cosHSS);
        }
        
        let hRad = 0;
        let valid = false;
        
        if (system === 'french') {
            hRad = degToRad((H - 12) * 15);
            valid = (hRad >= -hSunsetRad && hRad <= hSunsetRad);
        } else if (system === 'italic') {
            hRad = hSunsetRad + degToRad((H - 24) * 15);
            valid = (hRad >= -hSunsetRad && hRad <= hSunsetRad);
        } else if (system === 'babylonian') {
            hRad = -hSunsetRad + degToRad(H * 15);
            valid = (hRad >= -hSunsetRad && hRad <= hSunsetRad);
        } else if (system === 'temporary') {
            hRad = hSunsetRad * ((H / 6) - 1);
            valid = (hSunsetRad > 0.005);
        }
        
        if (valid) {
            const { alt, azi } = getSolarCoordinates(hRad, latRad, dRad);
            const shadow = getShadowCoordinates(alt, azi, decMuroRad, gnomonLength);
            
            if (shadow.visible) {
                if (Math.abs(shadow.x) < 450 && Math.abs(shadow.y) < 450) {
                    points.push({ x: shadow.x, y: -100 - shadow.y });
                }
            }
        }
    }
    return points;
}

// Declination lines for Vertical Dials
function getPointsForDeclinationLine(dDeg, lat, decMuro, gnomonLength) {
    const points = [];
    const latRad = degToRad(lat);
    const dRad = degToRad(dDeg);
    const decMuroRad = degToRad(decMuro);
    
    const cosHSS = -Math.tan(latRad) * Math.tan(dRad);
    let hSunsetRad = 0;
    if (cosHSS <= -1) {
        hSunsetRad = Math.PI;
    } else if (cosHSS >= 1) {
        hSunsetRad = 0;
    } else {
        hSunsetRad = Math.acos(cosHSS);
    }
    
    if (hSunsetRad < 0.005) return points;
    
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
        const hRad = -hSunsetRad + (2 * hSunsetRad * i) / steps;
        const { alt, azi } = getSolarCoordinates(hRad, latRad, dRad);
        const shadow = getShadowCoordinates(alt, azi, decMuroRad, gnomonLength);
        
        if (shadow.visible) {
            if (Math.abs(shadow.x) < 450 && Math.abs(shadow.y) < 450) {
                points.push({ x: shadow.x, y: -100 - shadow.y });
            }
        }
    }
    return points;
}

// Hour lines for Horizontal Dial
function getPointsForHorizontalHourLine(H, lat, a) {
    const points = [];
    const latRad = degToRad(lat);
    const hRad = degToRad((H - 12) * 15);
    
    for (let dDeg = -23.44; dDeg <= 23.44; dDeg += 1.5) {
        const dRad = degToRad(dDeg);
        
        const cosHSS = -Math.tan(latRad) * Math.tan(dRad);
        let hSunsetRad = 0;
        if (cosHSS <= -1) hSunsetRad = Math.PI;
        else if (cosHSS >= 1) hSunsetRad = 0;
        else hSunsetRad = Math.acos(cosHSS);
        
        if (hRad >= -hSunsetRad && hRad <= hSunsetRad) {
            const { alt, azi } = getSolarCoordinates(hRad, latRad, dRad);
            const shadow = getHorizontalShadowCoordinates(alt, azi, a);
            
            if (shadow.visible) {
                if (Math.abs(shadow.x) < 450 && Math.abs(shadow.y) < 450) {
                    points.push({ x: shadow.x, y: 100 - shadow.y }); // Y_O = 100
                }
            }
        }
    }
    return points;
}

// Declination lines for Horizontal Dial
function getPointsForHorizontalDeclinationLine(dDeg, lat, a) {
    const points = [];
    const latRad = degToRad(lat);
    const dRad = degToRad(dDeg);
    
    const cosHSS = -Math.tan(latRad) * Math.tan(dRad);
    let hSunsetRad = 0;
    if (cosHSS <= -1) hSunsetRad = Math.PI;
    else if (cosHSS >= 1) hSunsetRad = 0;
    else hSunsetRad = Math.acos(cosHSS);
    
    if (hSunsetRad < 0.005) return points;
    
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
        const hRad = -hSunsetRad + (2 * hSunsetRad * i) / steps;
        const { alt, azi } = getSolarCoordinates(hRad, latRad, dRad);
        const shadow = getHorizontalShadowCoordinates(alt, azi, a);
        
        if (shadow.visible) {
            if (Math.abs(shadow.x) < 450 && Math.abs(shadow.y) < 450) {
                points.push({ x: shadow.x, y: 100 - shadow.y }); // Y_O = 100
            }
        }
    }
    return points;
}

// Generate points for 12:00 clock time Lemniscate (Analemma) curve on Horizontal Dial
function getPointsForHorizontalAnalemma(lat, a) {
    const points = [];
    const latRad = degToRad(lat);
    
    for (let N = 1; N <= 365; N += 3) {
        const dRad = calcSolarDeclination(N);
        const eot = calcEquationOfTime(N);
        
        // Solar hour angle at 12:00 mean time: h = 0.25 deg * EoT (in minutes)
        const hRad = degToRad((eot / 60) * 15);
        
        const { alt, azi } = getSolarCoordinates(hRad, latRad, dRad);
        const shadow = getHorizontalShadowCoordinates(alt, azi, a);
        
        if (shadow.visible) {
            if (Math.abs(shadow.x) < 450 && Math.abs(shadow.y) < 450) {
                points.push({ x: shadow.x, y: 100 - shadow.y }); // Y_O = 100
            }
        }
    }
    return points;
}

// Helper to convert array of points to an SVG path 'd' attribute
function pointsToSVGPath(points) {
    if (points.length === 0) return '';
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
    }
    return d;
}

// ==========================================
// RENDER ENGINE
// ==========================================

function update() {
    // 1. Parse Input Values
    state.lat = parseFloat(el.latInput.value);
    state.lng = parseFloat(el.lngInput.value);
    state.decMuro = parseFloat(el.decInput.value);
    state.dst = el.dstInput.checked;
    state.timeString = el.timeInput.value;
    
    // Sync numerical outputs
    el.latVal.innerText = `${state.lat.toFixed(1)}° N`;
    el.lngVal.innerText = `${state.lng.toFixed(1)}° E`;
    
    let decStr = `${Math.abs(state.decMuro).toFixed(1)}°`;
    if (state.decMuro === 0) decStr += " (Sud)";
    else if (state.decMuro > 0) decStr += " (Ovest)";
    else decStr += " (Est)";
    el.decVal.innerText = decStr;
    
    // Parse selected date and time (only if NOT animating to avoid losing fractional seconds)
    if (!state.isAnimating) {
        const [hStr, mStr] = state.timeString.split(':');
        const selectedDate = new Date(el.dateInput.value);
        selectedDate.setHours(parseInt(hStr), parseInt(mStr), 0);
        state.date = selectedDate;
    }
    
    // 2. Astronomy Engine Calculations
    const solarDec = calcSolarDeclination(state.date);
    const eot = calcEquationOfTime(state.date);
    
    // Local Civil Time in decimal hours (T_civil) with high-precision seconds and milliseconds
    const tCivil = state.date.getHours() + state.date.getMinutes() / 60 + state.date.getSeconds() / 3600 + state.date.getMilliseconds() / 3600000;
    
    // Local Apparent Solar Time (T_solar)
    const dstCorrection = state.dst ? 1.0 : 0.0;
    const lngCorrection = 4 * (state.lng - 15 * state.timezone) / 60; // in hours
    const eotCorrection = eot / 60; // in hours
    
    let tSolar = tCivil - dstCorrection + eotCorrection + lngCorrection;
    tSolar = (tSolar + 24) % 24; // boundary wrapping
    
    // Solar Hour Angle (h)
    const hRad = degToRad((tSolar - 12) * 15);
    
    // Sun Altitude and Azimuth
    const latRad = degToRad(state.lat);
    const { alt: altRad, azi: aziRad } = getSolarCoordinates(hRad, latRad, solarDec);
    
    // Sunrise and Sunset (incorporating atmospheric refraction and solar semidiameter correction = -0.833 degrees)
    const sinH0 = Math.sin(degToRad(-0.833));
    const cosHSS = (sinH0 - Math.sin(latRad) * Math.sin(solarDec)) / (Math.cos(latRad) * Math.cos(solarDec));
    let hSunsetRad = 0;
    let polarState = "normal";
    
    if (cosHSS <= -1) {
        hSunsetRad = Math.PI;
        polarState = "polar_day";
    } else if (cosHSS >= 1) {
        hSunsetRad = 0;
        polarState = "polar_night";
    } else {
        hSunsetRad = Math.acos(cosHSS);
    }
    
    const tSolarSunrise = 12 - radToDeg(hSunsetRad) / 15;
    const tSolarSunset = 12 + radToDeg(hSunsetRad) / 15;
    
    // Convert Solar Sunrise/Sunset to Local Civil Times
    const tCivilSunrise = (solarToCivil(tSolarSunrise, state.dst, eot, state.lng, state.timezone) + 24) % 24;
    const tCivilSunset = (solarToCivil(tSolarSunset, state.dst, eot, state.lng, state.timezone) + 24) % 24;
    
    // Update Telemetry Display
    el.solarTimeVal.innerText = formatTime(tSolar);
    el.solarDecVal.innerText = `${solarDec >= 0 ? '+' : ''}${radToDeg(solarDec).toFixed(1)}°`;
    el.solarAltVal.innerText = altRad > 0 ? `${radToDeg(altRad).toFixed(1)}°` : 'Sotto l\'orizzonte';
    
    // Azimuth Display (Standard Clockwise from North, 0 to 360 degrees)
    let aziCardinal = 'N';
    const aziDeg = radToDeg(aziRad);
    if (aziDeg >= 337.5 || aziDeg < 22.5) aziCardinal = 'N';
    else if (aziDeg >= 22.5 && aziDeg < 67.5) aziCardinal = 'NE';
    else if (aziDeg >= 67.5 && aziDeg < 112.5) aziCardinal = 'E';
    else if (aziDeg >= 112.5 && aziDeg < 157.5) aziCardinal = 'SE';
    else if (aziDeg >= 157.5 && aziDeg < 202.5) aziCardinal = 'S';
    else if (aziDeg >= 202.5 && aziDeg < 247.5) aziCardinal = 'SO';
    else if (aziDeg >= 247.5 && aziDeg < 292.5) aziCardinal = 'O';
    else aziCardinal = 'NO';
    
    el.solarAziVal.innerText = `${aziDeg.toFixed(1)}° (${aziCardinal})`;
    
    // Sunrise/Sunset readouts
    if (polarState === "polar_day") {
        el.sunRiseSetVal.innerText = "Sole di mezzanotte";
    } else if (polarState === "polar_night") {
        el.sunRiseSetVal.innerText = "Notte polare";
    } else {
        const padStr = t => {
            const h = Math.floor(t);
            const m = Math.floor((t - h) * 60);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };
        el.sunRiseSetVal.innerText = `${padStr(tCivilSunrise)} / ${padStr(tCivilSunset)}`;
    }
    
    // EoT Display
    const eotMin = Math.floor(Math.abs(eot));
    const eotSec = Math.floor((Math.abs(eot) - eotMin) * 60);
    el.eotVal.innerText = `${eot >= 0 ? '+' : '-'}${eotMin}m ${eotSec}s`;
    
    // 3. Update French Analog Clock
    const sDeg = state.date.getSeconds() * 6;
    const mDeg = state.date.getMinutes() * 6 + state.date.getSeconds() * 0.1;
    const hDeg = (state.date.getHours() % 12) * 30 + state.date.getMinutes() * 0.5;
    
    el.frenchHourHand.style.transform = `rotate(${hDeg}deg)`;
    el.frenchMinHand.style.transform = `rotate(${mDeg}deg)`;
    el.frenchSecHand.style.transform = `rotate(${sDeg}deg)`;

    // 4. Calculate Current Shadow State (Vertical Dials)
    const currentShadow = getShadowCoordinates(altRad, aziRad, degToRad(state.decMuro), state.gnomonLength);
    const shadowSVG = {
        x: currentShadow.x,
        y: -100 - currentShadow.y,
        visible: currentShadow.visible,
        isNight: altRad <= 0,
        isBehindWall: altRad > 0 && !currentShadow.visible
    };
    
    // 5. Calculate Current Shadow State (Horizontal Pavement Dial)
    const currentHorizontalShadow = getHorizontalShadowCoordinates(altRad, aziRad, state.humanHeight);
    const shadowHorizontalSVG = {
        x: currentHorizontalShadow.x,
        y: 100 - currentHorizontalShadow.y, // Y_O = 100
        visible: currentHorizontalShadow.visible,
        isNight: altRad <= 0,
        tSolar: tSolar
    };
    
    // 6. Calculate Historical Time Values for Display
    let itValDecimal = (24 + tSolar - tSolarSunset) % 24;
    if (itValDecimal === 0) itValDecimal = 24;
    
    let baValDecimal = tSolar - tSolarSunrise;
    
    let teValDecimal = 12 * (tSolar - tSolarSunrise) / (tSolarSunset - tSolarSunrise);
    
    const isSunAboveHorizon = altRad > 0;
    
    if (isSunAboveHorizon && polarState === "normal") {
        el.valItalic.innerText = `${itValDecimal.toFixed(1)} ore (Ore ${Math.floor(itValDecimal)})`;
        el.valBabylonian.innerText = `${baValDecimal.toFixed(1)} ore (Ore ${Math.floor(baValDecimal)})`;
        el.valHorizontal.innerText = formatTime(tSolar);
        el.valFrenchVertical.innerText = shadowSVG.visible ? formatTime(tSolar) : (altRad > 0 ? "Ombra (Dietro parete)" : "Notte (Nessuna ombra)");
        
        let teInt = Math.floor(teValDecimal);
        if (teInt >= 0 && teInt < 12) {
            el.valTemporary.innerText = `Ora ${ROMAN_NUMERALS[teInt + 1] || teInt + 1} (${teValDecimal.toFixed(1)}a)`;
        } else {
            el.valTemporary.innerText = "Notte (Invisibile)";
        }
    } else {
        el.valItalic.innerText = isSunAboveHorizon ? `${itValDecimal.toFixed(1)}h` : "Notte (Nessuna ombra)";
        el.valBabylonian.innerText = isSunAboveHorizon ? `${baValDecimal.toFixed(1)}h` : "Notte (Nessuna ombra)";
        el.valTemporary.innerText = "Notte (Nessuna ombra)";
        el.valHorizontal.innerText = "Notte (Nessuna ombra)";
        el.valFrenchVertical.innerText = "Notte (Nessuna ombra)";
    }
    
    // 7. Draw the 5 Sundials + 1 Analemmatic
    renderSundial(el.svgItalic, el.msgItalic, 'italic', shadowSVG);
    renderSundial(el.svgBabylonian, el.msgBabylonian, 'babylonian', shadowSVG);
    renderSundial(el.svgTemporary, el.msgTemporary, 'temporary', shadowSVG);
    renderHorizontalSundial(el.svgHorizontal, el.msgHorizontal, shadowHorizontalSVG);
    renderFrenchVerticalSundial(el.svgFrenchVertical, el.msgFrenchVertical, shadowSVG);
    
    // 8. Update Equation of Time text description
    const formattedEoT = `${eot >= 0 ? '+' : '-'}${Math.floor(Math.abs(eot))}m ${Math.floor((Math.abs(eot) - Math.floor(Math.abs(eot))) * 60)}s`;
    const status = eot >= 0 ? 'Sole in anticipo' : 'Sole in ritardo';
    const monthsIT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    const dStr = `${state.date.getDate()} ${monthsIT[state.date.getMonth()]}`;
    el.analemmaDesc.innerHTML = `<strong style="color:var(--color-french)">${dStr}:</strong> EoT ${formattedEoT} (${status})`;
}

// ==========================================
// RENDER VERTICAL WALL SUNDIALS
// ==========================================

function renderSundial(svgElement, msgElement, system, shadowSVG) {
    let html = '';
    
    // Construction Grid lines
    html += `<line x1="0" y1="-180" x2="0" y2="220" class="substyle-line" />`;
    html += `<line x1="-200" y1="-100" x2="200" y2="-100" class="substyle-line" />`;
    
    // Dynamic Declination Curves
    // Winter Solstice (Capricorn) - Blue Curve
    const ptsCapricorn = getPointsForDeclinationLine(-23.44, state.lat, state.decMuro, state.gnomonLength);
    if (ptsCapricorn.length > 1) {
        html += `<path d="${pointsToSVGPath(ptsCapricorn)}" class="declination-line solstice-winter" />`;
        const pLabel = ptsCapricorn[ptsCapricorn.length - 1];
        if (pLabel && Math.abs(pLabel.x) < 185) {
            html += `<text x="${pLabel.x + 8}" y="${pLabel.y + 3}" class="axis-text" fill="#5e6b82" text-anchor="start">♑ Capricorno</text>`;
        }
    }
    
    // Equinox - Green Straight Line (for D=0, otherwise slightly curved)
    const ptsEquinox = getPointsForDeclinationLine(0.0, state.lat, state.decMuro, state.gnomonLength);
    if (ptsEquinox.length > 1) {
        html += `<path d="${pointsToSVGPath(ptsEquinox)}" class="declination-line equinox-line" />`;
        const pLabel = ptsEquinox[ptsEquinox.length - 1];
        if (pLabel && Math.abs(pLabel.x) < 185) {
            html += `<text x="${pLabel.x + 8}" y="${pLabel.y + 3}" class="axis-text" fill="#5e6b82" text-anchor="start">♎ Equinozi</text>`;
        }
    }
    
    // Summer Solstice (Cancer) - Red Curve
    const ptsCancer = getPointsForDeclinationLine(23.44, state.lat, state.decMuro, state.gnomonLength);
    if (ptsCancer.length > 1) {
        html += `<path d="${pointsToSVGPath(ptsCancer)}" class="declination-line solstice-summer" />`;
        const pLabel = ptsCancer[ptsCancer.length - 1];
        if (pLabel && Math.abs(pLabel.x) < 185) {
            html += `<text x="${pLabel.x + 8}" y="${pLabel.y + 3}" class="axis-text" fill="#5e6b82" text-anchor="start">♋ Cancro</text>`;
        }
    }
    
    // Hour Lines
    let hourList = [];
    if (system === 'italic') {
        hourList = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    } else if (system === 'babylonian') {
        hourList = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    } else if (system === 'temporary') {
        hourList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }
    
    hourList.forEach(H => {
        const pts = getPointsForHourLine(system, H, state.lat, state.decMuro, state.gnomonLength);
        if (pts.length > 1) {
            html += `<path d="${pointsToSVGPath(pts)}" class="hour-line" id="hour-line-${system}-${H}">
                        <title>Ora ${H} (${system})</title>
                     </path>`;
            
            // Draw numerical label at the furthest end of the path
            let maxDist = -1;
            let endPt = null;
            pts.forEach(p => {
                const d = Math.hypot(p.x, p.y + 100);
                if (d > maxDist) {
                    maxDist = d;
                    endPt = p;
                }
            });
            
            if (endPt) {
                const dx = endPt.x;
                const dy = endPt.y + 100;
                const len = Math.hypot(dx, dy);
                const ox = len > 0 ? (dx / len) * 12 : 0;
                const oy = len > 0 ? (dy / len) * 12 : 12;
                
                const labelText = system === 'temporary' ? ROMAN_NUMERALS[H] : H;
                html += `<text x="${(endPt.x + ox).toFixed(1)}" y="${(endPt.y + oy + 3).toFixed(1)}" class="hour-text" fill="#f1f3f9" text-anchor="middle">${labelText}</text>`;
            }
        }
    });
    
    // Gnomon Shadow Overlay
    if (shadowSVG.visible) {
        msgElement.style.display = 'none';
        
        if (Math.abs(shadowSVG.x) < 220 && shadowSVG.y > -220 && shadowSVG.y < 250) {
            html += `<line x1="0" y1="-100" x2="${shadowSVG.x.toFixed(1)}" y2="${shadowSVG.y.toFixed(1)}" class="shadow-ray" />`;
            html += `<circle cx="${shadowSVG.x.toFixed(1)}" cy="${shadowSVG.y.toFixed(1)}" r="7.5" class="shadow-dot-blur" />`;
            html += `<circle cx="${shadowSVG.x.toFixed(1)}" cy="${shadowSVG.y.toFixed(1)}" r="3" class="shadow-dot" />`;
        }
    } else {
        msgElement.style.display = 'block';
        if (shadowSVG.isNight) {
            msgElement.innerText = "Sole sotto l'orizzonte (Notte)";
        } else {
            msgElement.innerText = "Sole dietro la parete (Ombra)";
        }
    }
    
    // Style Perpendicular Nodus base
    html += `<circle cx="0" cy="-100" r="5" class="gnomon-base" />`;
    html += `<circle cx="0" cy="-100" r="1.5" class="gnomon-base-dot" />`;
    html += `<text x="0" y="-112" class="label-text" fill="#909bb0" font-weight="700">STILO</text>`;
    
    // Est / Ovest markers
    html += `<text x="-180" y="-105" class="axis-text" fill="#5e6b82" text-anchor="start">O (Ovest)</text>`;
    html += `<text x="180" y="-105" class="axis-text" fill="#5e6b82" text-anchor="end">E (Est)</text>`;
    
    let statusText = `&phi; = ${state.lat.toFixed(1)}° | D = ${state.decMuro.toFixed(1)}°`;
    html += `<text x="0" y="205" class="label-text" fill="#909bb0" font-size="7px">${statusText}</text>`;
    
    svgElement.innerHTML = html;
}

// ==========================================
// RENDER HORIZONTAL PAVEMENT PLAZA SUNDIAL
// ==========================================

function renderHorizontalSundial(svgElement, msgElement, shadowSVG) {
    let html = '';
    
    const A = 150; // Semi-major axis (East-West)
    const latRad = degToRad(state.lat);
    const B = A * Math.sin(latRad); // Semi-minor axis (North-South) - dynamically changes with latitude!
    
    // 1. Plaza Pavement Grid (Concentric Circles & Radial Faint Lines for premium texture)
    html += `<circle cx="0" cy="100" r="50" class="pavement-ring" />`;
    html += `<circle cx="0" cy="100" r="100" class="pavement-ring" />`;
    html += `<circle cx="0" cy="100" r="150" class="pavement-ring" />`;
    
    // Meridian axis (Nord-Sud)
    html += `<line x1="0" y1="-200" x2="0" y2="200" class="substyle-line" />`;
    // Est-Ovest axis
    html += `<line x1="-200" y1="100" x2="200" y2="100" class="substyle-line" />`;
    
    // Cardinal Markers
    html += `<text x="0" y="-180" class="cardinal-marker cardinal-marker-north" fill="#d94b36">N (Nord)</text>`;
    html += `<text x="0" y="192" class="cardinal-marker" fill="#909bb0">S (Sud)</text>`;
    html += `<text x="180" y="103" class="cardinal-marker" fill="#909bb0">E (Est)</text>`;
    html += `<text x="-180" y="103" class="cardinal-marker" fill="#909bb0">O (Ovest)</text>`;
    
    // 2. The Elliptical Ring of the Analemmatic Sundial
    html += `<ellipse cx="0" cy="100" rx="${A}" ry="${B.toFixed(1)}" class="ellipse-ring" style="fill: none; stroke: rgba(0, 242, 254, 0.22); stroke-width: 1.5; stroke-dasharray: 4 4;" />`;
    
    // 3. Hour Markers on the Ellipse (French hours from 6 to 18)
    const hourList = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    hourList.forEach(H => {
        const h = degToRad((H - 12) * 15);
        const xH = A * Math.sin(h);
        const yH = 100 - B * Math.cos(h);
        
        // Hour marker point
        html += `<circle cx="${xH.toFixed(1)}" cy="${yH.toFixed(1)}" r="4.5" class="hour-dot" style="fill: #ffffff; stroke: var(--color-french); stroke-width: 1.5; filter: drop-shadow(0 0 3px var(--color-french));" />`;
        
        // Hour labels slightly offset outwards from the ellipse
        const dx = xH;
        const dy = yH - 100;
        const len = Math.hypot(dx, dy);
        const ox = len > 0 ? (dx / len) * 13 : 0;
        const oy = len > 0 ? (dy / len) * 13 : -13;
        
        html += `<text x="${(xH + ox).toFixed(1)}" y="${(yH + oy + 3).toFixed(1)}" class="hour-text" fill="#f1f3f9" text-anchor="middle" font-size="8px" font-family="'JetBrains Mono', monospace">${H}</text>`;
    });
    
    // 4. Central Meridian Date Scale (Where the human gnomon moves)
    const ySummer = A * Math.tan(degToRad(23.44)) * Math.cos(latRad);
    const yWinter = A * Math.tan(degToRad(-23.44)) * Math.cos(latRad); // negative
    
    // Draw the scale line in gold/warm beige
    html += `<line x1="0" y1="${(100 - ySummer).toFixed(1)}" x2="0" y2="${(100 - yWinter).toFixed(1)}" style="stroke: var(--color-italic); stroke-width: 2.5; stroke-linecap: round; opacity: 0.85;" />`;
    
    // Tick marks and labels for the 3 points (Solstices and Equinoxes)
    // Summer Solstice (21 Giu - Cancro ♋)
    html += `<line x1="-5" y1="${(100 - ySummer).toFixed(1)}" x2="5" y2="${(100 - ySummer).toFixed(1)}" style="stroke: #ff4757; stroke-width: 1.5;" />`;
    html += `<circle cx="0" cy="${(100 - ySummer).toFixed(1)}" r="3" style="fill: #ff4757; stroke: #ffffff; stroke-width: 1;" />`;
    html += `<text x="9" y="${(100 - ySummer + 2.5).toFixed(1)}" style="font-size: 5.5px; font-weight: 700; fill: #ff4757; font-family: inherit;" text-anchor="start">Solstizio Estate (21 Giu) ♋</text>`;
    
    // Equinoxes (21 Mar / 23 Set - Bilancia ♎)
    html += `<line x1="-5" y1="100" x2="5" y2="100" style="stroke: #00db6e; stroke-width: 1.5;" />`;
    html += `<circle cx="0" cy="100" r="3" style="fill: #00db6e; stroke: #ffffff; stroke-width: 1;" />`;
    html += `<text x="9" y="102.5" style="font-size: 5.5px; font-weight: 700; fill: #00db6e; font-family: inherit;" text-anchor="start">Equinozi (21 Mar / 23 Set) ♎</text>`;
    
    // Winter Solstice (21 Dic - Capricorno ♑)
    html += `<line x1="-5" y1="${(100 - yWinter).toFixed(1)}" x2="5" y2="${(100 - yWinter).toFixed(1)}" style="stroke: #00a8ff; stroke-width: 1.5;" />`;
    html += `<circle cx="0" cy="${(100 - yWinter).toFixed(1)}" r="3" style="fill: #00a8ff; stroke: #ffffff; stroke-width: 1;" />`;
    html += `<text x="9" y="${(100 - yWinter + 2.5).toFixed(1)}" style="font-size: 5.5px; font-weight: 700; fill: #00a8ff; font-family: inherit;" text-anchor="start">Solstizio Inverno (21 Dic) ♑</text>`;
    
    // 5. Dynamic Human Gnomon Positioning
    const solarDec = calcSolarDeclination(state.date);
    const yGnomon = A * Math.tan(solarDec) * Math.cos(latRad);
    const gnomonY = 100 - yGnomon;
    
    // 6. Dynamic Shadow and Reading Ray
    if (shadowSVG.visible) {
        msgElement.style.display = 'none';
        
        // Calculate raw shadow offset vector
        const shX = shadowSVG.x;
        const shY = 100 - shadowSVG.y;
        
        // Shadow tip coordinates relative to the gnomon's dynamic position:
        const tipX = shX;
        const tipY = gnomonY - shY;
        
        const length = Math.hypot(tipX, tipY - gnomonY);
        const angleRad = Math.atan2(tipY - gnomonY, tipX);
        const angleDeg = radToDeg(angleRad);
        

        
        // Draw an elegant, thin, glowing dashed golden/cyan reading ray extending from the gnomon's feet all the way out
        const rayLength = 220;
        const rayEndX = rayLength * Math.cos(angleRad);
        const rayEndY = gnomonY + rayLength * Math.sin(angleRad);
        html += `<line x1="0" y1="${gnomonY.toFixed(1)}" x2="${rayEndX.toFixed(1)}" y2="${rayEndY.toFixed(1)}" class="shadow-ray" style="stroke: var(--color-french); stroke-width: 1.25; stroke-dasharray: 2.5 3.5; opacity: 0.75;" />`;
        
        // Draw a glowing dynamic target dot directly at the intersection of the ray with the ellipse for the current solar time!
        if (shadowSVG.tSolar !== undefined) {
            const hSolarRad = degToRad((shadowSVG.tSolar - 12) * 15);
            const xInter = A * Math.sin(hSolarRad);
            const yInter = 100 - B * Math.cos(hSolarRad);
            
            // Glowing outer target halo
            html += `<circle cx="${xInter.toFixed(1)}" cy="${yInter.toFixed(1)}" r="7.5" style="fill: none; stroke: #ffffff; stroke-width: 1.5; filter: drop-shadow(0 0 6px #ffffff); opacity: 0.95; animation: pulse-border 1.5s infinite ease-in-out;" />`;
            // Core target dot
            html += `<circle cx="${xInter.toFixed(1)}" cy="${yInter.toFixed(1)}" r="2.5" style="fill: #ffffff;" />`;
        }
        
    } else {
        msgElement.style.display = 'block';
        msgElement.innerText = "Sole sotto l'orizzonte (Notte)";
    }
    
    // 7. Draw the Standing Human Silhouette at (0, gnomonY)
    // Head & shoulders viewed from above
    html += `<ellipse cx="0" cy="${gnomonY.toFixed(1)}" rx="9" ry="5.5" class="human-gnomon-figure" />`;
    html += `<circle cx="0" cy="${gnomonY.toFixed(1)}" r="4.5" class="human-gnomon-figure" />`;
    html += `<text x="0" y="${(gnomonY + 14).toFixed(1)}" class="label-text" fill="#ffffff" font-weight="700" font-size="5.5px" style="text-shadow: 0 0 4px rgba(0,0,0,0.8);">GNOMONE UMANO</text>`;
    
    // Status text at the bottom
    let statusText = `&phi; = ${state.lat.toFixed(1)}° | Meridiana Analemmatica Orizzontale`;
    html += `<text x="0" y="190" class="label-text" fill="#909bb0" font-size="6px">${statusText}</text>`;
    
    svgElement.innerHTML = html;
}

// ==========================================
// RENDER VERTICAL FRENCH SUNDIAL WITH LEMNISCATE
// ==========================================

function renderFrenchVerticalSundial(svgElement, msgElement, shadowSVG) {
    let html = '';
    
    // Construction Grid lines
    html += `<line x1="0" y1="-180" x2="0" y2="220" class="substyle-line" />`;
    html += `<line x1="-200" y1="-100" x2="200" y2="-100" class="substyle-line" />`;
    
    // Dynamic Declination Curves (solstices and equinoxes)
    // Winter Solstice (Capricorn) - Blue Curve
    const ptsCapricorn = getPointsForDeclinationLine(-23.44, state.lat, state.decMuro, state.gnomonLength);
    if (ptsCapricorn.length > 1) {
        html += `<path d="${pointsToSVGPath(ptsCapricorn)}" class="declination-line solstice-winter" />`;
        const pLabel = ptsCapricorn[ptsCapricorn.length - 1];
        if (pLabel && Math.abs(pLabel.x) < 185) {
            html += `<text x="${pLabel.x + 8}" y="${pLabel.y + 3}" class="axis-text" fill="#5e6b82" text-anchor="start">♑ Capricorno</text>`;
        }
    }
    
    // Equinox - Green Straight Line (for D=0, otherwise slightly curved)
    const ptsEquinox = getPointsForDeclinationLine(0.0, state.lat, state.decMuro, state.gnomonLength);
    if (ptsEquinox.length > 1) {
        html += `<path d="${pointsToSVGPath(ptsEquinox)}" class="declination-line equinox-line" />`;
        const pLabel = ptsEquinox[ptsEquinox.length - 1];
        if (pLabel && Math.abs(pLabel.x) < 185) {
            html += `<text x="${pLabel.x + 8}" y="${pLabel.y + 3}" class="axis-text" fill="#5e6b82" text-anchor="start">♎ Equinozi</text>`;
        }
    }
    
    // Summer Solstice (Cancer) - Red Curve
    const ptsCancer = getPointsForDeclinationLine(23.44, state.lat, state.decMuro, state.gnomonLength);
    if (ptsCancer.length > 1) {
        html += `<path d="${pointsToSVGPath(ptsCancer)}" class="declination-line solstice-summer" />`;
        const pLabel = ptsCancer[ptsCancer.length - 1];
        if (pLabel && Math.abs(pLabel.x) < 185) {
            html += `<text x="${pLabel.x + 8}" y="${pLabel.y + 3}" class="axis-text" fill="#5e6b82" text-anchor="start">♋ Cancro</text>`;
        }
    }
    
    // French Hour Lines (typically from 6 to 18)
    const hourList = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    hourList.forEach(H => {
        const pts = getPointsForHourLine('french', H, state.lat, state.decMuro, state.gnomonLength);
        if (pts.length > 1) {
            html += `<path d="${pointsToSVGPath(pts)}" class="hour-line" id="hour-line-french-vertical-${H}">
                        <title>Ora Francese ${H}</title>
                     </path>`;
            
            // Draw numerical label at the furthest end of the path
            let maxDist = -1;
            let endPt = null;
            pts.forEach(p => {
                const d = Math.hypot(p.x, p.y + 100);
                if (d > maxDist) {
                    maxDist = d;
                    endPt = p;
                }
            });
            
            if (endPt) {
                const dx = endPt.x;
                const dy = endPt.y + 100;
                const len = Math.hypot(dx, dy);
                const ox = len > 0 ? (dx / len) * 12 : 0;
                const oy = len > 0 ? (dy / len) * 12 : 12;
                
                html += `<text x="${(endPt.x + ox).toFixed(1)}" y="${(endPt.y + oy + 3).toFixed(1)}" class="hour-text" fill="#f1f3f9" text-anchor="middle">${H}</text>`;
            }
        }
    });
    
    // 3.5 Lemniscata (Analemma) Curve along the 12:00 (Noon) hour line
    // Calculate noon lemniscate points projected onto this specific declined vertical wall!
    const ptsLemniscate = [];
    const latRad = degToRad(state.lat);
    const decMuroRad = degToRad(state.decMuro);
    
    for (let N = 1; N <= 365; N += 3) {
        const dRad = calcSolarDeclination(N);
        const eot = calcEquationOfTime(N);
        
        // Solar hour angle at 12:00 mean time: h = 0.25 deg * EoT (in minutes)
        const hRad = degToRad((eot / 60) * 15);
        
        const { alt, azi } = getSolarCoordinates(hRad, latRad, dRad);
        const shadow = getShadowCoordinates(alt, azi, decMuroRad, state.gnomonLength);
        
        if (shadow.visible) {
            if (Math.abs(shadow.x) < 450 && Math.abs(shadow.y) < 450) {
                ptsLemniscate.push({ x: shadow.x, y: -100 - shadow.y });
            }
        }
    }
    
    if (ptsLemniscate.length > 1) {
        html += `<path d="${pointsToSVGPath(ptsLemniscate)}" class="analemma-curve-vertical" style="fill: none; stroke: var(--color-french); stroke-width: 1.5; stroke-dasharray: 2.5 3.5; opacity: 0.85;" />`;
    }
    
    // Gnomon Shadow Overlay
    if (shadowSVG.visible) {
        msgElement.style.display = 'none';
        
        if (Math.abs(shadowSVG.x) < 220 && shadowSVG.y > -220 && shadowSVG.y < 250) {
            html += `<line x1="0" y1="-100" x2="${shadowSVG.x.toFixed(1)}" y2="${shadowSVG.y.toFixed(1)}" class="shadow-ray" />`;
            html += `<circle cx="${shadowSVG.x.toFixed(1)}" cy="${shadowSVG.y.toFixed(1)}" r="7.5" class="shadow-dot-blur" />`;
            html += `<circle cx="${shadowSVG.x.toFixed(1)}" cy="${shadowSVG.y.toFixed(1)}" r="3" class="shadow-dot" />`;
        }
    } else {
        msgElement.style.display = 'block';
        if (shadowSVG.isNight) {
            msgElement.innerText = "Sole sotto l'orizzonte (Notte)";
        } else {
            msgElement.innerText = "Sole dietro la parete (Ombra)";
        }
    }
    
    // Style Perpendicular Nodus base
    html += `<circle cx="0" cy="-100" r="5" class="gnomon-base" />`;
    html += `<circle cx="0" cy="-100" r="1.5" class="gnomon-base-dot" />`;
    html += `<text x="0" y="-112" class="label-text" fill="#909bb0" font-weight="700">STILO</text>`;
    
    // Est / Ovest markers
    html += `<text x="-180" y="-105" class="axis-text" fill="#5e6b82" text-anchor="start">O (Ovest)</text>`;
    html += `<text x="180" y="-105" class="axis-text" fill="#5e6b82" text-anchor="end">E (Est)</text>`;
    
    let statusText = `&phi; = ${state.lat.toFixed(1)}° | D = ${state.decMuro.toFixed(1)}° | Lemniscata 12:00`;
    html += `<text x="0" y="205" class="label-text" fill="#909bb0" font-size="7px">${statusText}</text>`;
    
    svgElement.innerHTML = html;
}

// ==========================================
// INTERACTIVE EVENT HANDLERS
// ==========================================

function initEvents() {
    el.latInput.addEventListener('input', update);
    el.lngInput.addEventListener('input', update);
    el.decInput.addEventListener('input', update);
    el.dateInput.addEventListener('change', update);
    el.timeInput.addEventListener('input', update);
    el.dstInput.addEventListener('change', update);
    
    // Preset Buttons Click handlers
    el.presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            el.presetBtns.forEach(b => b.classList.remove('active'));
            
            if (e.target.id === 'btn-custom') {
                e.target.classList.add('active');
                toggleGpsButton();
                return;
            }
            
            e.target.classList.add('active');
            
            const presetLat = parseFloat(e.target.dataset.lat);
            const presetLng = parseFloat(e.target.dataset.lng);
            
            el.latInput.value = presetLat;
            el.lngInput.value = presetLng;
            
            toggleGpsButton();
            update();
        });
    });
    
    // If user changes Lat/Lng sliders manually, set Preset to "Personalizzata"
    const handleManualCoordinates = () => {
        el.presetBtns.forEach(b => b.classList.remove('active'));
        el.btnCustom.classList.add('active');
        toggleGpsButton();
    };
    el.latInput.addEventListener('input', handleManualCoordinates);
    el.lngInput.addEventListener('input', handleManualCoordinates);

    // GPS Geolocation Click Handler
    el.btnGps.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert("La geolocalizzazione non è supportata dal tuo browser.");
            return;
        }
        
        el.btnGps.disabled = true;
        el.btnGps.innerHTML = `<i data-lucide="loader" class="inline-icon" style="width: 15px; height: 15px; animation: spin-loader 1s linear infinite;"></i> Rilevamento in corso...`;
        lucide.createIcons();
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Snap values to bounds [10, 70] and [-30, 60]
                const boundedLat = Math.max(10, Math.min(70, lat));
                const boundedLng = Math.max(-30, Math.min(60, lng));
                
                el.latInput.value = boundedLat.toFixed(4);
                el.lngInput.value = boundedLng.toFixed(4);
                
                // Show notification success state
                el.btnGps.disabled = false;
                el.btnGps.innerHTML = `<i data-lucide="check" class="inline-icon" style="width: 15px; height: 15px; color: #27ae60;"></i> Posizione Rilevata!`;
                lucide.createIcons();
                
                setTimeout(() => {
                    el.btnGps.innerHTML = `<i data-lucide="locate" class="inline-icon" style="width: 15px; height: 15px;"></i> Rileva Posizione GPS`;
                    lucide.createIcons();
                }, 2000);
                
                update();
            },
            (error) => {
                el.btnGps.disabled = false;
                el.btnGps.innerHTML = `<i data-lucide="locate" class="inline-icon" style="width: 15px; height: 15px;"></i> Rileva Posizione GPS`;
                lucide.createIcons();
                
                let errMsg = "Impossibile rilevare la posizione.";
                if (error.code === error.PERMISSION_DENIED) {
                    errMsg = "Permesso negato per l'accesso alla geolocalizzazione.";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errMsg = "Informazioni di posizione non disponibili.";
                } else if (error.code === error.TIMEOUT) {
                    errMsg = "Tempo massimo di rilevamento superato.";
                }
                alert(errMsg);
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
            }
        );
    });

    // Wall Declination Preset Buttons Click handlers
    const decPresetBtns = document.querySelectorAll('.btn-dec-preset');
    decPresetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            decPresetBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const decVal = parseFloat(e.target.dataset.dec);
            el.decInput.value = decVal;
            update();
        });
    });
    
    // If user changes Wall Declination slider manually, sync buttons active state
    el.decInput.addEventListener('input', () => {
        decPresetBtns.forEach(b => {
            const decVal = parseFloat(b.dataset.dec);
            if (decVal === parseFloat(el.decInput.value)) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
    });

    // Animation Loop handling
    el.animateInput.addEventListener('change', (e) => {
        state.isAnimating = e.target.checked;
        toggleSpeedControl();
        if (state.isAnimating) {
            state.lastFrameTime = performance.now();
            requestAnimationFrame(animationLoop);
        }
    });
    
    // Animation Speed input listener
    el.speedInput.addEventListener('input', () => {
        state.animationSpeed = parseFloat(el.speedInput.value);
        el.speedVal.innerText = `${state.animationSpeed}m/s`;
    });
}

function animationLoop(timestamp) {
    if (!state.isAnimating) return;
    
    if (!state.lastFrameTime) state.lastFrameTime = timestamp;
    const deltaMs = timestamp - state.lastFrameTime;
    state.lastFrameTime = timestamp;
    
    // Advance state.date using high-precision milliseconds
    const minutesToAdvance = (state.animationSpeed * deltaMs) / 1000;
    state.date.setTime(state.date.getTime() + minutesToAdvance * 60 * 1000);
    
    // Sync back to DOM inputs to show the ticking clock correctly
    const year = state.date.getFullYear();
    const month = String(state.date.getMonth() + 1).padStart(2, '0');
    const day = String(state.date.getDate()).padStart(2, '0');
    el.dateInput.value = `${year}-${month}-${day}`;
    
    const hours = String(state.date.getHours()).padStart(2, '0');
    const minutes = String(state.date.getMinutes()).padStart(2, '0');
    el.timeInput.value = `${hours}:${minutes}`;
    
    update();
    
    requestAnimationFrame(animationLoop);
}

// Toggle visibility of GPS button based on active preset
function toggleGpsButton() {
    if (el.btnCustom.classList.contains('active')) {
        el.gpsContainer.style.display = 'block';
    } else {
        el.gpsContainer.style.display = 'none';
    }
}

// Toggle visibility of speed control slider based on active animation
function toggleSpeedControl() {
    if (el.animateInput.checked) {
        el.speedContainer.style.display = 'block';
    } else {
        el.speedContainer.style.display = 'none';
    }
}

// ==========================================
// APPLICATION INITIALIZATION
// ==========================================

function init() {
    // 1. Initialize Lucide Icons
    lucide.createIcons();
    
    // 2. Set current real Date and Time in the picker inputs
    const now = new Date();
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    el.dateInput.value = `${year}-${month}-${day}`;
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    el.timeInput.value = `${hours}:${minutes}`;
    
    // Determine DST based on local browser system timezone offset
    const janOffset = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
    const julOffset = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
    const isDstActive = now.getTimezoneOffset() < Math.max(janOffset, julOffset);
    el.dstInput.checked = isDstActive;
    
    // 3. Bind Event listeners
    initEvents();
    toggleGpsButton();
    toggleSpeedControl();
    
    // Collapsible controls toggle logic for small screen vertical mobile devices
    const toggleBtn = document.getElementById('btn-toggle-controls');
    const controlCard = document.getElementById('quadrant-1');
    if (toggleBtn && controlCard) {
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = controlCard.classList.toggle('collapsed');
            toggleBtn.innerHTML = isCollapsed ? 
                `<i data-lucide="chevron-down"></i><span>Espandi</span>` : 
                `<i data-lucide="chevron-up"></i><span>Comprimi</span>`;
            if (window.lucide) {
                window.lucide.createIcons();
            }
        });
        
        // Collapse by default on small vertical cell phone screens (< 500px)
        if (window.innerWidth < 500) {
            controlCard.classList.add('collapsed');
            toggleBtn.innerHTML = `<i data-lucide="chevron-down"></i><span>Espandi</span>`;
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    }
    
    // 4. Initial calculations & drawing loop
    update();
}

// Run on page load
window.addEventListener('DOMContentLoaded', init);
