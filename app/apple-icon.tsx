import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #090d16 0%, #064e3b 100%)',
          borderRadius: 36,
          border: '4px solid rgba(52, 211, 153, 0.5)',
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: 72,
            color: '#34d399',
            marginBottom: 8,
          }}
        >
          ✦
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '2px',
          }}
        >
          WAFY
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
