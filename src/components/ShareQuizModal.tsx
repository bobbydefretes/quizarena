import React, { useEffect, useRef, useState } from 'react';
import { Quiz, Language } from '../types';
import { translations } from '../utils/i18n';
import { soundManager } from '../utils/sound';
import { X, Download, Copy, Check, Share2, Sparkles, ExternalLink } from 'lucide-react';

interface ShareQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
  gamePin?: string;
  lang: Language;
}

export const ShareQuizModal: React.FC<ShareQuizModalProps> = ({
  isOpen,
  onClose,
  quiz,
  gamePin,
  lang
}) => {
  const t = translations[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const shareUrl = gamePin
    ? `${window.location.origin}/?pin=${gamePin}&client=true`
    : `${window.location.origin}/?quizId=${quiz.id}`;

  const shareTitle = gamePin
    ? `${quiz.title} (PIN: ${gamePin})`
    : quiz.title;

  const shareMessage = lang === 'id'
    ? `🔥 Ayo mainkan kuis "${quiz.title}"${gamePin ? ` dengan PIN Game: ${gamePin}` : ''}! Pindai atau buka link berikut:`
    : `🔥 Come play the "${quiz.title}" quiz${gamePin ? ` with Game PIN: ${gamePin}` : ''}! Join here:`;

  // Generate preview image on Canvas
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas dimensions (800 x 450, 16:9 social card format)
    const width = 800;
    const height = 450;
    canvas.width = width;
    canvas.height = height;

    // 1. Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#030712'); // very deep slate/blue
    bgGradient.addColorStop(0.5, '#0f172a');
    bgGradient.addColorStop(1, '#1e3a8a'); // rich royal blue
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative radial lights
    const glow1 = ctx.createRadialGradient(100, 80, 10, 100, 80, 250);
    glow1.addColorStop(0, 'rgba(250, 204, 21, 0.18)'); // yellow glow
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(width - 120, height - 100, 10, width - 120, height - 100, 300);
    glow2.addColorStop(0, 'rgba(59, 130, 246, 0.25)'); // blue glow
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // 2. Card Inner Border
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // 3. Top Header Bar
    ctx.fillStyle = '#facc15';
    ctx.font = '900 15px sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('🏆 QUIZARENA LIVE • TRIVIA BATTLE', 40, 52);

    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 13px sans-serif';
    ctx.fillText('QR Code & Live Multiplayer', width - 230, 52);

    // 4. Emoji / Cover Icon Box
    ctx.fillStyle = '#172554';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, 85, 90, 90, 20);
    ctx.fill();
    ctx.stroke();

    ctx.font = '54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(quiz.coverImage || '🎯', 85, 130);

    // 5. Quiz Title (Multi-line text wrapping)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px sans-serif';

    const words = quiz.title.split(' ');
    let line = '';
    let y = 92;
    const maxWidth = width - 180;
    const lineHeight = 38;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), 155, y);
        line = words[n] + ' ';
        y += lineHeight;
        if (y > 170) {
          line += '...';
          break;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), 155, y);

    // 6. Badges (Category, Difficulty, Questions Count)
    const badgeY = 210;

    // Category Pill
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(40, badgeY, 150, 36, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`📁 ${quiz.category}`, 54, badgeY + 10);

    // Difficulty Pill
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(205, badgeY, 110, 36, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = quiz.difficulty === 'Easy' ? '#4ade80' : quiz.difficulty === 'Medium' ? '#facc15' : '#f87171';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`⚡ ${quiz.difficulty}`, 220, badgeY + 10);

    // Questions Pill
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(330, badgeY, 155, 36, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`❓ ${quiz.questions.length} Questions`, 345, badgeY + 10);

    // 7. PIN Box or Live Callout
    if (gamePin) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(40, 270, width - 80, 85, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(lang === 'id' ? 'MASUKKAN PIN GAME UNTUK BERGABUNG:' : 'ENTER GAME PIN TO JOIN:', 65, 290);

      ctx.fillStyle = '#facc15';
      ctx.font = '900 42px monospace';
      ctx.fillText(gamePin, 65, 310);

      ctx.fillStyle = '#bfdbfe';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Scan QR or visit link to play live ➔', width - 70, 318);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = 'rgba(30, 58, 138, 0.5)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(40, 270, width - 80, 85, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('Ready for the challenge?', 65, 292);

      ctx.fillStyle = '#bfdbfe';
      ctx.font = 'normal 14px sans-serif';
      ctx.fillText(quiz.description ? quiz.description.slice(0, 75) + '...' : 'Play solo or host this quiz for friends and colleagues live!', 65, 320);
    }

    // 8. Footer Bar
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('QUIZARENA LIVE • Custom Trivia & QR Code Battles', 40, height - 35);

    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'right';
    ctx.fillText('Play Now 🎮', width - 40, height - 35);
    ctx.textAlign = 'left';

    // Store preview image data URL
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewImageUrl(dataUrl);
    } catch (e) {
      console.error('Canvas export error:', e);
    }
  }, [isOpen, quiz, gamePin, lang]);

  if (!isOpen) return null;

  // Share handlers
  const handleShareWhatsApp = () => {
    soundManager.playClick();
    const text = `${shareMessage}\n\n${shareUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareTwitter = () => {
    soundManager.playClick();
    const tweetText = `${shareMessage}\n#QuizArena #Trivia`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () => {
    soundManager.playClick();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = () => {
    soundManager.playClick();
    if (!previewImageUrl) return;
    const a = document.createElement('a');
    a.href = previewImageUrl;
    const sanitizedTitle = quiz.title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    a.download = `quizarena_${sanitizedTitle}_card.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeviceShare = async () => {
    soundManager.playClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareMessage,
          url: shareUrl
        });
      } catch (err) {
        console.error('Device share error:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-blue-900 border border-blue-700/80 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-blue-800 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-blue-950 shadow-md">
              <Share2 className="w-5 h-5 text-blue-950" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{t.shareQuiz}</h3>
              <p className="text-xs text-blue-200">{t.shareSubtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-blue-950 hover:bg-blue-800 text-blue-200 hover:text-white transition-colors border border-blue-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden Canvas for Generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Generated Image Preview Card */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-blue-200">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>{t.previewCard}</span>
            </span>
            <button
              onClick={handleDownloadImage}
              className="text-yellow-400 hover:text-yellow-300 flex items-center space-x-1 text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.downloadCard} (.PNG)</span>
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden border-2 border-yellow-400/40 shadow-2xl bg-blue-950 group">
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt={quiz.title}
                className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.01]"
              />
            ) : (
              <div className="h-56 flex items-center justify-center text-blue-300 text-xs">
                Generating preview card...
              </div>
            )}
            <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-blue-950/80 backdrop-blur-sm text-[10px] text-yellow-300 font-mono border border-blue-700">
              HD Card 16:9
            </div>
          </div>
        </div>

        {/* Social Sharing Buttons Grid */}
        <div className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-blue-200">
            {lang === 'id' ? 'Bagikan Langsung Ke:' : 'Share Directly To:'}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md transform hover:-translate-y-0.5"
            >
              <span className="text-base">💬</span>
              <span>{t.shareWhatsApp}</span>
            </button>

            {/* Twitter / X */}
            <button
              onClick={handleShareTwitter}
              className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md transform hover:-translate-y-0.5"
            >
              <span className="font-mono text-sm font-black">𝕏</span>
              <span>{t.shareTwitter}</span>
            </button>

            {/* Facebook */}
            <button
              onClick={handleShareFacebook}
              className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md transform hover:-translate-y-0.5"
            >
              <span className="font-bold text-sm">f</span>
              <span>{t.shareFacebook}</span>
            </button>
          </div>

          {/* Copy Link & Download Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-blue-950 border border-blue-700 rounded-xl pl-3 pr-24 py-2.5 text-xs text-blue-200 font-mono focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-blue-950 text-xs font-black flex items-center space-x-1 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (lang === 'id' ? 'Disalin!' : 'Copied!') : t.copyShareLink}</span>
              </button>
            </div>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleDeviceShare}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-800 text-blue-200 hover:text-white border border-blue-700 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5 text-yellow-400" />
                <span>{t.shareDevice}</span>
              </button>
            )}

            <button
              onClick={handleDownloadImage}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-800 text-yellow-400 border border-blue-700 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors whitespace-nowrap shadow-sm"
              title="Download Card Image"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.downloadCard}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
