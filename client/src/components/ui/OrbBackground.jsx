const ORB_CSS = `
  @keyframes orbMove1 {
    0%   { transform: translate(0px,   0px)   scale(1);    }
    30%  { transform: translate(38px,  -26px)  scale(1.06); }
    65%  { transform: translate(-22px,  42px)  scale(0.93); }
    100% { transform: translate(18px,  -14px)  scale(1.1);  }
  }
  @keyframes orbMove2 {
    0%   { transform: translate(0px,   0px)   scale(1);    }
    40%  { transform: translate(-44px,  28px)  scale(0.91); }
    100% { transform: translate(30px,  -38px)  scale(1.08); }
  }
  @keyframes orbMove3 {
    0%   { transform: translate(0px,   0px)   scale(1);    }
    25%  { transform: translate(32px,   46px)  scale(1.07); }
    60%  { transform: translate(-36px,  18px)  scale(0.92); }
    100% { transform: translate(22px,  -32px)  scale(1.05); }
  }
  @keyframes orbMove4 {
    0%   { transform: translate(0px,   0px)   scale(1);    }
    50%  { transform: translate(-28px, -44px)  scale(1.1);  }
    100% { transform: translate(34px,   22px)  scale(0.9);  }
  }
  @keyframes orbMove5 {
    0%   { transform: translate(0px,   0px)   scale(1);    }
    35%  { transform: translate(48px,   24px)  scale(0.94); }
    70%  { transform: translate(-32px, -22px)  scale(1.06); }
    100% { transform: translate(14px,   36px)  scale(0.97); }
  }
  @keyframes orbMove6 {
    0%   { transform: translate(0px,   0px)   scale(1);    }
    45%  { transform: translate(-38px,  32px)  scale(1.08); }
    100% { transform: translate(42px,  -28px)  scale(0.92); }
  }
  @keyframes orbMove7 {
    0%   { transform: translate(0px,   0px)   scale(1);    }
    20%  { transform: translate(26px,  -42px)  scale(1.05); }
    55%  { transform: translate(-42px,  16px)  scale(0.9);  }
    100% { transform: translate(20px,   32px)  scale(1.08); }
  }
  @keyframes orbMove8 {
    0%   { transform: translate(0px,   0px)   scale(1);    }
    60%  { transform: translate(-34px, -38px)  scale(0.93); }
    100% { transform: translate(38px,   26px)  scale(1.07); }
  }

  @keyframes orbPulseA { from { opacity: 0.6;  } to { opacity: 1.0;  } }
  @keyframes orbPulseB { from { opacity: 0.65; } to { opacity: 0.95; } }
  @keyframes orbPulseC { from { opacity: 0.55; } to { opacity: 0.9;  } }
  @keyframes orbPulseD { from { opacity: 0.7;  } to { opacity: 1.0;  } }

  @keyframes orbGlow1 {
    0%,100% { box-shadow: 0 0  60px 10px rgba(196,30,51,0.00); opacity: 0.7;  }
    50%     { box-shadow: 0 0 120px 40px rgba(196,30,51,0.35); opacity: 1.0;  }
  }
  @keyframes orbGlow2 {
    0%,100% { box-shadow: 0 0  60px 10px rgba(196,30,51,0.00); opacity: 0.7;  }
    50%     { box-shadow: 0 0 115px 38px rgba(196,30,51,0.32); opacity: 0.98; }
  }
  @keyframes orbGlow3 {
    0%,100% { box-shadow: 0 0  60px 10px rgba(196,30,51,0.00); opacity: 0.7;  }
    50%     { box-shadow: 0 0 125px 42px rgba(196,30,51,0.38); opacity: 1.0;  }
  }
  @keyframes orbGlow4 {
    0%,100% { box-shadow: 0 0  60px 10px rgba(196,30,51,0.00); opacity: 0.7;  }
    50%     { box-shadow: 0 0 110px 36px rgba(196,30,51,0.30); opacity: 0.95; }
  }
  @keyframes orbGlow5 {
    0%,100% { box-shadow: 0 0  60px 10px rgba(196,30,51,0.00); opacity: 0.7;  }
    50%     { box-shadow: 0 0 120px 40px rgba(196,30,51,0.36); opacity: 1.0;  }
  }
  @keyframes orbGlow6 {
    0%,100% { box-shadow: 0 0  60px 10px rgba(196,30,51,0.00); opacity: 0.7;  }
    50%     { box-shadow: 0 0 118px 39px rgba(196,30,51,0.33); opacity: 0.97; }
  }
  @keyframes orbGlow7 {
    0%,100% { box-shadow: 0 0  60px 10px rgba(196,30,51,0.00); opacity: 0.7;  }
    50%     { box-shadow: 0 0 122px 41px rgba(196,30,51,0.37); opacity: 1.0;  }
  }
  @keyframes orbGlow8 {
    0%,100% { box-shadow: 0 0  60px 10px rgba(196,30,51,0.00); opacity: 0.7;  }
    50%     { box-shadow: 0 0 112px 37px rgba(196,30,51,0.31); opacity: 0.96; }
  }

  .orb-bg-orb {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(196,30,51,0.55), transparent 70%);
    will-change: transform;
  }

  @media (prefers-reduced-motion: reduce) {
    .orb-bg-orb { animation: none !important; opacity: 0.75 !important; }
  }
`;

const ORBS = [
  { w: 320, top:  '4%',  left:  '-5%', blur: 80, move: 'orbMove1', movDur: '18s', movDelay:   '0s', pulse: 'orbPulseA', pulseDur: '24s', pulseDelay:  '-5s', glow: 'orbGlow1', glowDur:  '6s',   glowDelay:   '0s' },
  { w: 240, top:  '2%',  left:  '67%', blur: 70, move: 'orbMove2', movDur: '22s', movDelay:  '-4s', pulse: 'orbPulseB', pulseDur: '20s', pulseDelay:  '-8s', glow: 'orbGlow2', glowDur:  '8s',   glowDelay:   '3s' },
  { w: 380, top: '75%',  left:   '2%', blur: 90, move: 'orbMove3', movDur: '28s', movDelay:  '-8s', pulse: 'orbPulseC', pulseDur: '30s', pulseDelay:  '-3s', glow: 'orbGlow3', glowDur:  '5s',   glowDelay:   '7s' },
  { w: 180, top: '72%',  left:  '71%', blur: 60, move: 'orbMove4', movDur: '14s', movDelay:  '-2s', pulse: 'orbPulseD', pulseDur: '18s', pulseDelay: '-12s', glow: 'orbGlow4', glowDur:  '7s',   glowDelay:  '11s' },
  { w: 280, top: '36%',  left:  '-7%', blur: 75, move: 'orbMove5', movDur: '20s', movDelay: '-11s', pulse: 'orbPulseA', pulseDur: '26s', pulseDelay:  '-7s', glow: 'orbGlow5', glowDur:  '4s',   glowDelay:   '5s' },
  { w: 220, top: '40%',  left:  '75%', blur: 65, move: 'orbMove6', movDur: '16s', movDelay:  '-6s', pulse: 'orbPulseB', pulseDur: '22s', pulseDelay: '-15s', glow: 'orbGlow6', glowDur:  '6.5s', glowDelay:  '13s' },
  { w: 350, top:  '-5%', left:  '28%', blur: 85, move: 'orbMove7', movDur: '24s', movDelay: '-15s', pulse: 'orbPulseC', pulseDur: '28s', pulseDelay:  '-2s', glow: 'orbGlow7', glowDur:  '5.5s', glowDelay:   '9s' },
  { w: 200, top: '80%',  left:  '36%', blur: 70, move: 'orbMove8', movDur: '12s', movDelay:  '-3s', pulse: 'orbPulseD', pulseDur: '19s', pulseDelay:  '-9s', glow: 'orbGlow8', glowDur:  '7.5s', glowDelay:  '15s' },
];

export default function OrbBackground() {
  return (
    <>
      <style>{ORB_CSS}</style>

      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 0,
          overflow: 'hidden', pointerEvents: 'none',
        }}
      >
        {ORBS.map((orb, i) => (
          <div
            key={i}
            className="orb-bg-orb"
            style={{
              width:  orb.w,
              height: orb.w,
              top:    orb.top,
              left:   orb.left,
              filter: `blur(${orb.blur}px)`,
              animation: [
                `${orb.move}  ${orb.movDur}   ease-in-out infinite alternate`,
                `${orb.pulse} ${orb.pulseDur} ease-in-out infinite alternate`,
                `${orb.glow}  ${orb.glowDur}  ease-in-out infinite`,
              ].join(', '),
              animationDelay: `${orb.movDelay}, ${orb.pulseDelay}, ${orb.glowDelay}`,
            }}
          />
        ))}
      </div>

      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 5, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 30%, #080607 85%)',
        }}
      />
    </>
  );
}
