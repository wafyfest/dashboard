'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Share2,
  Upload,
  Sparkles,
  Trophy,
  Award,
  Check,
  RotateCcw,
  Sliders,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  MoveVertical
} from 'lucide-react';

export interface PosterInitialData {
  studentName: string;
  itemEnglish: string;
  phase: string;
  prize: string;
  collegeName?: string;
  chestNo?: string;
}

interface ResultPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: PosterInitialData;
}

export function ResultPosterModal({
  isOpen,
  onClose,
  initialData
}: ResultPosterModalProps) {
  // Form fields for the 4 key blanks
  const [studentName, setStudentName] = useState(initialData.studentName || '');
  const [itemEnglish, setItemEnglish] = useState(initialData.itemEnglish || '');
  const [phase, setPhase] = useState(initialData.phase || '');
  const [prize, setPrize] = useState(initialData.prize || '');
  const [collegeName, setCollegeName] = useState(initialData.collegeName || '');
  const [chestNo, setChestNo] = useState(initialData.chestNo || '');

  // Background template mode: 'default' | 'custom'
  const [bgMode, setBgMode] = useState<'default' | 'custom'>('default');
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [textColorTheme, setTextColorTheme] = useState<'gold_white' | 'dark_navy' | 'emerald_gold'>('gold_white');

  // Positioning fine-tuning for custom background blanks
  const [prizeY, setPrizeY] = useState<number>(380);
  const [studentY, setStudentY] = useState<number>(510);
  const [phaseY, setPhaseY] = useState<number>(610);
  const [itemY, setItemY] = useState<number>(690);
  const [collegeY, setCollegeY] = useState<number>(850);
  const [showAdvancedPositions, setShowAdvancedPositions] = useState<boolean>(false);

  // Status indicators
  const [isDownloading, setIsDownloading] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const customImgRef = useRef<HTMLImageElement | null>(null);

  // Sync state when initialData changes
  useEffect(() => {
    if (isOpen) {
      setStudentName(initialData.studentName || '');
      setItemEnglish(initialData.itemEnglish || '');
      setPhase(initialData.phase || '');
      setPrize(initialData.prize || '');
      setCollegeName(initialData.collegeName || '');
      setChestNo(initialData.chestNo || '');

      // Trigger celebratory confetti on open
      try {
        if (typeof window !== 'undefined') {
          import('canvas-confetti').then(confettiModule => {
            const confetti = confettiModule.default || confettiModule;
            confetti({
              particleCount: 70,
              spread: 60,
              origin: { y: 0.6 }
            });
          }).catch(() => {});
        }
      } catch {
        // Ignore confetti errors
      }
    }
  }, [isOpen, initialData]);

  // Handle custom background image upload
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        const result = event.target?.result as string;
        setCustomBgUrl(result);
        setBgMode('custom');

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          customImgRef.current = img;
          renderPoster();
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset positions to standard defaults
  const handleResetPositions = () => {
    setPrizeY(380);
    setStudentY(510);
    setPhaseY(610);
    setItemY(690);
    setCollegeY(850);
  };

  // Canvas drawing routine
  const renderPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions: High resolution 1080 x 1080
    const W = 1080;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    // ── 1. DRAW BACKGROUND ──────────────────────────────────────────
    if (bgMode === 'custom' && customImgRef.current) {
      // Draw uploaded custom background image
      ctx.drawImage(customImgRef.current, 0, 0, W, H);
    } else {
      // Draw Built-in Fest Masterpiece Background
      // Main deep gradient
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#061325'); // Deep Navy
      bgGrad.addColorStop(0.5, '#0B1E36'); // Midnight Blue
      bgGrad.addColorStop(1, '#050E1A'); // Obsidian Navy
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Radial Gold/Emerald Accent Glow in center
      const glowGrad = ctx.createRadialGradient(W / 2, 540, 50, W / 2, 540, 500);
      glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
      glowGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, W, H);

      // Elegant Outer Double Golden Border
      ctx.strokeStyle = '#D4AF37'; // Metallic Gold
      ctx.lineWidth = 4;
      ctx.strokeRect(36, 36, W - 72, H - 72);

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(48, 48, W - 96, H - 96);

      // Corner Ornaments
      const cornerSize = 40;
      const corners = [
        [48, 48],
        [W - 48, 48],
        [48, H - 48],
        [W - 48, H - 48]
      ];
      ctx.fillStyle = '#F59E0B';
      corners.forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Header Banner: Fest Name & Branding
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Small top emblem star
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 22px serif';
      ctx.fillText('✦  14TH WAFY ARTS FEST  ✦', W / 2, 120);

      // Sub-banner
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 16px sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('WAFY STUDENTS FEDERATION (WSF)', W / 2, 155);

      // Decorative divider under header
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 180, 185);
      ctx.lineTo(W / 2 + 180, 185);
      ctx.stroke();

      // Certificate of Achievement Tag
      ctx.fillStyle = '#10B981'; // Emerald
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('OFFICIAL MERIT OF EXCELLENCE', W / 2, 220);
    }

    // ── 2. COLOR PALETTE FOR TEXT ───────────────────────────────────
    let primaryTextColor = '#FFFFFF';
    let secondaryTextColor = '#E2E8F0';
    let goldColor = '#F59E0B';
    let prizeBadgeBg = 'rgba(245, 158, 11, 0.2)';
    let prizeBadgeBorder = '#F59E0B';

    if (textColorTheme === 'dark_navy') {
      primaryTextColor = '#0F172A';
      secondaryTextColor = '#334155';
      goldColor = '#B45309';
      prizeBadgeBg = 'rgba(180, 83, 9, 0.15)';
      prizeBadgeBorder = '#B45309';
    } else if (textColorTheme === 'emerald_gold') {
      primaryTextColor = '#FFFFFF';
      secondaryTextColor = '#A7F3D0';
      goldColor = '#FBBF24';
      prizeBadgeBg = 'rgba(16, 185, 129, 0.25)';
      prizeBadgeBorder = '#10B981';
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // ── 3. FIELD 1: PRIZE GOT ───────────────────────────────────────
    if (prize.trim()) {
      const prizeText = prize.toUpperCase().trim();
      ctx.font = '900 36px sans-serif';
      const prizeMetrics = ctx.measureText(prizeText);
      const badgeWidth = Math.max(340, prizeMetrics.width + 80);
      const badgeHeight = 64;
      const badgeX = W / 2 - badgeWidth / 2;
      const badgeY = prizeY - badgeHeight / 2;

      // Prize Badge Container
      ctx.fillStyle = prizeBadgeBg;
      ctx.strokeStyle = prizeBadgeBorder;
      ctx.lineWidth = 2.5;

      // Rounded rectangle
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 32);
      ctx.fill();
      ctx.stroke();

      // Prize Text with slight shadow
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = goldColor;
      ctx.fillText(prizeText, W / 2, prizeY);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // ── 4. FIELD 2: NAME OF STUDENT ─────────────────────────────────
    if (studentName.trim()) {
      // Label prefix: Awarded To
      ctx.fillStyle = goldColor;
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('CONGRATULATIONS TO', W / 2, studentY - 48);

      // Student Name in bold prominent letters
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = primaryTextColor;

      // Dynamic font size scaling if name is long
      let nameFontSize = 54;
      if (studentName.length > 25) nameFontSize = 42;
      else if (studentName.length > 18) nameFontSize = 48;

      ctx.font = `900 ${nameFontSize}px "Cinzel", "Georgia", "Times New Roman", serif`;
      ctx.fillText(studentName.toUpperCase(), W / 2, studentY);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Elegant underline ornament under name
      ctx.strokeStyle = goldColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 120, studentY + 36);
      ctx.lineTo(W / 2 + 120, studentY + 36);
      ctx.stroke();
    }

    // ── 5. FIELD 3: PHASE ───────────────────────────────────────────
    if (phase.trim()) {
      const phaseText = `[ ${phase.toUpperCase()} CATEGORY ]`;
      ctx.fillStyle = goldColor;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(phaseText, W / 2, phaseY);
    }

    // ── 6. FIELD 4: ITEM NAME (ENGLISH) ─────────────────────────────
    if (itemEnglish.trim()) {
      // Event label
      ctx.fillStyle = secondaryTextColor;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('FOR SECURING VICTORY IN', W / 2, itemY - 34);

      // Event title
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = primaryTextColor;

      let itemFontSize = 44;
      if (itemEnglish.length > 28) itemFontSize = 34;
      else if (itemEnglish.length > 20) itemFontSize = 38;

      ctx.font = `bold ${itemFontSize}px sans-serif`;
      ctx.fillText(itemEnglish, W / 2, itemY + 8);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // ── 7. FOOTER: COLLEGE & CHEST NUMBER ───────────────────────────
    if (collegeName || chestNo) {
      ctx.fillStyle = secondaryTextColor;
      ctx.font = '600 18px sans-serif';
      const colText = [collegeName, chestNo ? `Chest No: ${chestNo}` : ''].filter(Boolean).join(' • ');
      ctx.fillText(colText, W / 2, collegeY);
    }

    // Footer Motto
    if (bgMode === 'default') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'italic 14px serif';
      ctx.fillText('14th Wafy Arts Fest • Intellectual Eloquence & Artistic Brilliance', W / 2, H - 70);
    }
  }, [
    studentName,
    itemEnglish,
    phase,
    prize,
    collegeName,
    chestNo,
    bgMode,
    textColorTheme,
    prizeY,
    studentY,
    phaseY,
    itemY,
    collegeY
  ]);

  // Re-render when any input or state changes
  useEffect(() => {
    if (isOpen) {
      renderPoster();
    }
  }, [isOpen, renderPoster]);

  // Download high-resolution PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDownloading(true);
    try {
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const safeName = (studentName || 'Participant').replace(/[^a-zA-Z0-9]/g, '_');
      const safeItem = (itemEnglish || 'Event').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Wafy_Fest_Poster_${safeName}_${safeItem}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  // Direct Social Media Share via Web Share API
  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async blob => {
        if (!blob) return;
        const file = new File([blob], `Wafy_Fest_Result_${studentName || 'Winner'}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `14th Wafy Arts Fest - ${prize || 'Winner'}`,
            text: `Proud to share my achievement in ${itemEnglish} (${phase}) at the 14th Wafy Arts Fest!`,
            files: [file]
          });
          setIsShared(true);
          setTimeout(() => setIsShared(false), 3000);
        } else {
          // Fallback on desktop: Download image and open WhatsApp Web
          handleDownload();
          const shareText = encodeURIComponent(
            `Alhamdulillah! Secured ${prize} in ${itemEnglish} (${phase}) at the 14th Wafy Arts Fest! 🏆`
          );
          window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
        }
      }, 'image/png', 1.0);
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Social Media Poster Generator"
      description="Download your official 14th Wafy Arts Fest achievement poster for WhatsApp Status, Instagram, and Facebook."
      maxWidth="3xl"
    >
      <div className="space-y-5 pt-1 text-xs">
        {/* Main Grid: Poster Preview on Left, Customization on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Interactive Canvas Poster Preview */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden shadow-elevated border border-[var(--border-subtle)] [box-shadow:var(--shadow-elevated),var(--glass-highlight)] bg-[#050B14] relative group">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block"
                style={{ imageRendering: 'crisp-edges' }}
              />
              <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[var(--f-saffron)] text-[10px] font-mono font-bold border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                1080 × 1080 HD
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="w-full max-w-[420px] flex items-center gap-2 mt-3.5">
              <Button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 bg-[var(--f-saffron)] hover:bg-[var(--f-saffron-hover)] text-[#090d1a] font-heading font-bold py-2.5 text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)]"
              >
                <Download className="w-4 h-4" />
                <span>{isDownloading ? 'Exporting HD...' : 'Download Poster (PNG)'}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleShare}
                className="px-3.5 py-2.5 border-[var(--border-medium)] hover:bg-[var(--bg-hover)] text-xs font-heading font-semibold flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)]"
                title="Share to WhatsApp / Social Media"
              >
                {isShared ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4 text-sky-500" />}
                <span className="hidden sm:inline">{isShared ? 'Shared!' : 'Share'}</span>
              </Button>
            </div>
          </div>

          {/* Right: Customization Controls for the 4 blanks */}
          <div className="lg:col-span-5 space-y-4 bg-[var(--bg-subtle)]/70 p-3.5 sm:p-4 rounded-2xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="font-heading font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
                <span>Poster Details & Blanks</span>
              </span>
              <Badge variant="saffron" size="sm" className="text-[10px]">
                Live Preview
              </Badge>
            </div>

            {/* Field 1: Student Name */}
            <div>
              <label className="block text-[11px] font-heading font-bold text-[var(--text-secondary)] mb-1">
                Student Name *
              </label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="Enter student name"
                className="w-full px-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] font-semibold font-sans focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] transition-all"
              />
            </div>

            {/* Field 2: Item Name (English) */}
            <div>
              <label className="block text-[11px] font-heading font-bold text-[var(--text-secondary)] mb-1">
                Event Name (English) *
              </label>
              <input
                type="text"
                value={itemEnglish}
                onChange={e => setItemEnglish(e.target.value)}
                placeholder="e.g. English Elocution, Essay Writing"
                className="w-full px-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] font-semibold font-sans focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] transition-all"
              />
            </div>

            {/* Field 3: Phase / Category */}
            <div>
              <label className="block text-[11px] font-heading font-bold text-[var(--text-secondary)] mb-1">
                Phase / Category *
              </label>
              <input
                type="text"
                value={phase}
                onChange={e => setPhase(e.target.value)}
                placeholder="e.g. Senior, Junior, Sub Junior, General"
                className="w-full px-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] font-semibold font-sans focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] transition-all"
              />
            </div>

            {/* Field 4: Prize Got */}
            <div>
              <label className="block text-[11px] font-heading font-bold text-[var(--text-secondary)] mb-1">
                Prize Got *
              </label>
              <input
                type="text"
                value={prize}
                onChange={e => setPrize(e.target.value)}
                placeholder="e.g. FIRST PRIZE 🥇, SECOND PRIZE 🥈"
                className="w-full px-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] font-heading font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-[var(--f-saffron)]/40 focus:border-[var(--f-saffron)] transition-all"
              />
            </div>

            {/* Background Template Controls */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
              <span className="text-[11px] font-heading font-bold text-[var(--text-secondary)] block">
                Poster Background Template:
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBgMode('default');
                    renderPoster();
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-heading font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    bgMode === 'default'
                      ? 'bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-sm shadow-amber-500/20'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Default Template</span>
                </button>

                <label
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-heading font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    bgMode === 'custom'
                      ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold border border-amber-500/40 shadow-xs'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{customBgUrl ? 'Change Image' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBgUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Text Theme Selector */}
              <div className="pt-2">
                <label className="block text-[10px] font-heading font-semibold text-[var(--text-muted)] mb-1">
                  Text Color Palette:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTextColorTheme('gold_white')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-heading font-semibold transition-all border ${
                      textColorTheme === 'gold_white'
                        ? 'border-amber-400/40 bg-amber-400/20 text-amber-900 dark:text-amber-300 shadow-xs'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    Gold & White
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextColorTheme('emerald_gold')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-heading font-semibold transition-all border ${
                      textColorTheme === 'emerald_gold'
                        ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 shadow-xs'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    Emerald Glow
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextColorTheme('dark_navy')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-heading font-semibold transition-all border ${
                      textColorTheme === 'dark_navy'
                        ? 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    Dark (for light bg)
                  </button>
                </div>
              </div>

              {/* Advanced Blank Positions Toggle (Useful for aligning with custom blank posters) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedPositions(!showAdvancedPositions)}
                  className="text-[11px] font-heading font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)]"
                >
                  <MoveVertical className="w-3 h-3" />
                  <span>{showAdvancedPositions ? 'Hide Blank Position Controls' : 'Fine-Tune Blank Positions (Sliders)'}</span>
                </button>

                {showAdvancedPositions && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-semibold text-[var(--text-muted)]">Vertical Alignment (Y):</span>
                      <button
                        type="button"
                        onClick={handleResetPositions}
                        className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 font-heading font-semibold"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Reset
                      </button>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="font-sans">Prize Banner:</span>
                        <span className="font-mono">{prizeY}px</span>
                      </div>
                      <input
                        type="range"
                        min="200"
                        max="800"
                        value={prizeY}
                        onChange={e => setPrizeY(Number(e.target.value))}
                        className="w-full h-1 accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="font-sans">Student Name:</span>
                        <span className="font-mono">{studentY}px</span>
                      </div>
                      <input
                        type="range"
                        min="300"
                        max="850"
                        value={studentY}
                        onChange={e => setStudentY(Number(e.target.value))}
                        className="w-full h-1 accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="font-sans">Phase / Category:</span>
                        <span className="font-mono">{phaseY}px</span>
                      </div>
                      <input
                        type="range"
                        min="350"
                        max="900"
                        value={phaseY}
                        onChange={e => setPhaseY(Number(e.target.value))}
                        className="w-full h-1 accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="font-sans">Event Name (English):</span>
                        <span className="font-mono">{itemY}px</span>
                      </div>
                      <input
                        type="range"
                        min="400"
                        max="950"
                        value={itemY}
                        onChange={e => setItemY(Number(e.target.value))}
                        className="w-full h-1 accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
