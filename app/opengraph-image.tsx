import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = '14th Wafy Arts Fest | Official Management Portal';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #090d16 0%, #0d1b2a 40%, #064e3b 100%)',
          padding: '60px 70px',
          fontFamily: 'sans-serif',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Glow ambient circle */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)',
          }}
        />

        {/* Top Bar: Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                fontWeight: 900,
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(5, 150, 105, 0.4)',
              }}
            >
              ✦
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px', color: '#ffffff' }}>
                WAFY ARTS FEST
              </span>
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
                Coordination of Islamic Colleges (CIC)
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1.5px solid rgba(52, 211, 153, 0.4)',
              color: '#34d399',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            ● LIVE FESTIVAL PORTAL
          </div>
        </div>

        {/* Center: Main Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#34d399',
            }}
          >
            14th Edition • WSF Grand Cultural Conclave
          </div>
          <div
            style={{
              fontSize: '56px',
              fontWeight: 900,
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
              color: '#ffffff',
            }}
          >
            Inter-College Arts Fest Management System
          </div>
          <div
            style={{
              fontSize: '20px',
              lineHeight: 1.4,
              color: '#cbd5e1',
              fontWeight: 400,
            }}
          >
            Admit Cards • Blind Tabulation • Stage Schedules • Real-Time Scoreboards
          </div>
        </div>

        {/* Bottom Bar: Key Metrics */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            paddingTop: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px', fontWeight: 900, color: '#34d399' }}>25+</span>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Colleges</span>
          </div>
          <span style={{ color: 'rgba(148, 163, 184, 0.4)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px', fontWeight: 900, color: '#34d399' }}>1,700+</span>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Candidates</span>
          </div>
          <span style={{ color: 'rgba(148, 163, 184, 0.4)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px', fontWeight: 900, color: '#34d399' }}>84+</span>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Items</span>
          </div>
          <span style={{ color: 'rgba(148, 163, 184, 0.4)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#cbd5e1', fontWeight: 600 }}>
              Wafy Students Federation (WSF)
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
