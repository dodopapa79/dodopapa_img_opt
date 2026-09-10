/**
 * Generates sample test image files programmatically using HTML Canvas
 * so that users can immediately test the optimization & editor studio.
 */
export async function createSampleImages(): Promise<File[]> {
  const samples = [
    {
      title: '네이버 블로그 리뷰 - 테라스 카페 디저트',
      subtitle: 'CAFE TERRACE LATTE & SCONE',
      filename: 'sample_cafe_review.jpg',
      width: 1600,
      height: 1200,
      gradientStart: '#2A2A2E',
      gradientEnd: '#141416',
      accentColor: '#F59E0B',
    },
    {
      title: '스마트폰 언박싱 & 스펙 상세 비교',
      subtitle: 'TECH GADGET UNBOXING 2026',
      filename: 'sample_tech_gadget.jpg',
      width: 1920,
      height: 1080,
      gradientStart: '#1E293B',
      gradientEnd: '#0F172A',
      accentColor: '#38BDF8',
    },
  ];

  const files: File[] = [];

  for (const sample of samples) {
    const canvas = document.createElement('canvas');
    canvas.width = sample.width;
    canvas.height = sample.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, sample.width, sample.height);
    grad.addColorStop(0, sample.gradientStart);
    grad.addColorStop(1, sample.gradientEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, sample.width, sample.height);

    // Decorative grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const step = 80;
    for (let x = 0; x < sample.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, sample.height);
      ctx.stroke();
    }
    for (let y = 0; y < sample.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(sample.width, y);
      ctx.stroke();
    }

    // Mock central card / product presentation
    const cardW = sample.width * 0.65;
    const cardH = sample.height * 0.6;
    const cardX = (sample.width - cardW) / 2;
    const cardY = (sample.height - cardH) / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 24);
    ctx.fill();
    ctx.stroke();

    // Mock plate / gadget circle
    ctx.fillStyle = sample.accentColor;
    ctx.beginPath();
    ctx.arc(sample.width / 2, sample.height / 2 - 40, 110, 0, Math.PI * 2);
    ctx.fill();

    // Inner icon circle
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(sample.width / 2, sample.height / 2 - 40, 50, 0, Math.PI * 2);
    ctx.fill();

    // Typography
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 54px Pretendard, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sample.title, sample.width / 2, sample.height / 2 + 140);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '500 28px Pretendard, sans-serif';
    ctx.fillText(sample.subtitle, sample.width / 2, sample.height / 2 + 190);

    // Mock license plate / private info box to test mosaic tool
    const mockBoxW = 260;
    const mockBoxH = 50;
    const mockBoxX = cardX + 40;
    const mockBoxY = cardY + cardH - 80;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(mockBoxX, mockBoxY, mockBoxW, mockBoxH);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('12가 3456 (모자이크 테스트)', mockBoxX + 15, mockBoxY + 34);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
    });

    const file = new File([blob], sample.filename, { type: 'image/jpeg' });
    files.push(file);
  }

  return files;
}
