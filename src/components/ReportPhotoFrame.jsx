export const defaultReportPhotoCrop = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export function normalizeReportPhotoCrop(crop = defaultReportPhotoCrop) {
  const rawScale = crop.scale ?? crop.zoom ?? defaultReportPhotoCrop.scale;
  const scale = Math.max(1, Math.min(2.4, Number(rawScale) || defaultReportPhotoCrop.scale));
  const maxOffset = Math.max(0, (scale - 1) * 50);

  return {
    scale,
    offsetX: Math.max(-maxOffset, Math.min(maxOffset, Number(crop.offsetX) || 0)),
    offsetY: Math.max(-maxOffset, Math.min(maxOffset, Number(crop.offsetY) || 0)),
  };
}

export function getReportPhotoStyle(photo) {
  const crop = normalizeReportPhotoCrop(photo?.crop);

  return {
    transform: `translate(${crop.offsetX}%, ${crop.offsetY}%) scale(${crop.scale})`,
  };
}

export default function ReportPhotoFrame({
  photo,
  alt = '本学期靓照',
  className = '',
  interactive = false,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  if (!photo?.dataUrl) return null;

  const frameClassName = ['reportPhotoFrame', className].filter(Boolean).join(' ');

  return (
    <div
      className={frameClassName}
      onPointerCancel={interactive ? onPointerCancel : undefined}
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
    >
      <img src={photo.dataUrl} alt={alt} style={getReportPhotoStyle(photo)} />
    </div>
  );
}
