import { ImageResponse } from 'next/og';

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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399',
            marginBottom: 8,
          }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
          </svg>
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
