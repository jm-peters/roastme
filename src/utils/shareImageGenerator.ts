// utils/shareImageGenerator.ts

export async function generateShareImage(
  photoUrl: string,
  roastText: string,
  userId: string,
  username?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject('Canvas not supported');

    // Set dimensions for optimal sharing (Instagram/WhatsApp) - Higher Res
    canvas.width = 1200;
    canvas.height = 1200;

    // Brutalist background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Neon border
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 30;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    // Load and draw user photo with brutalist frame
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // Draw photo with offset frame
      const photoSize = 500;
      const photoX = (canvas.width - photoSize) / 2;
      const photoY = 150;

      // Shadow/Offset frame
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(photoX + 20, photoY + 20, photoSize, photoSize);
      
      // Main photo frame
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      ctx.strokeRect(photoX, photoY, photoSize, photoSize);
      ctx.drawImage(img, photoX, photoY, photoSize, photoSize);

      // Add roast text with brutalist styling
      ctx.textAlign = 'center';
      ctx.font = 'bold 72px "Inter", system-ui, -apple-system';
      ctx.fillStyle = '#FFFFFF';
      
      const maxWidth = 1000;
      const lineHeight = 90;
      const lines = wrapText(ctx, `"${roastText}"`, maxWidth);
      const startY = 750;
      
      lines.forEach((line, index) => {
        // Draw text with neon glow effect
        ctx.shadowColor = '#00FF00';
        ctx.shadowBlur = 15;
        ctx.fillText(line.toUpperCase(), canvas.width / 2, startY + (index * lineHeight));
        ctx.shadowBlur = 0; // Reset for next elements
      });

      // Add attribution with brutalist tag
      const tagY = 1050;
      const currentUsername = username || localStorage.getItem('username') || 'roaster';
      
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(canvas.width / 2 - 350, tagY - 50, 700, 80);
      
      ctx.font = 'bold 40px monospace';
      ctx.fillStyle = '#000000';
      ctx.fillText(`@${currentUsername.toUpperCase()} GOT ROASTED 🔥`, canvas.width / 2, tagY + 5);

      // Add app branding
      ctx.font = '24px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('CHALLENGE AT:', canvas.width / 2, 1140);
      
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = '#00FF00';
      ctx.fillText('ROASTME.SITE', canvas.width / 2, 1175);

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => reject('Failed to load image');
    img.src = photoUrl;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}
