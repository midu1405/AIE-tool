import QRCode from "qrcode";

// Xem trước giấy chứng nhận trên web (SVG co giãn theo khung). Bố cục khớp lib/certificate-pdf.ts và artboard ChungNhan.
// Không có mã (trước khi cấp) thì ô QR và mã để mờ.
export type PreviewData = { fullName: string; courseTitle: string; meta: string; code?: string; verifyUrl?: string; signerName?: string; signerTitle?: string };

const W = 1123;
const H = 794;

function qrPath(url: string) {
  const q = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = q.modules.size;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.modules.get(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { n, d };
}

/** Ước lượng cỡ chữ để dòng vừa maxW (Be Vietnam Pro: trung bình ~0.56 em mỗi ký tự ở chữ đậm). */
function fitSize(text: string, size: number, maxW: number, min: number, em = 0.56) {
  return Math.max(min, Math.min(size, Math.floor(maxW / Math.max(1, text.length * em))));
}

/** Chia tên khoá dài thành tối đa 2 dòng. */
function twoLines(text: string, maxChars: number) {
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  let first = "";
  while (words.length && (first + " " + words[0]).trim().length <= maxChars) first = (first + " " + words.shift()).trim();
  return [first, words.join(" ")];
}

export function CertificatePreview({ data, label }: { data: PreviewData; label: string }) {
  const nameSize = fitSize(data.fullName || " ", 50, 900, 28);
  const title = twoLines(data.courseTitle, 58);
  const qr = data.verifyUrl ? qrPath(data.verifyUrl) : null;
  const metaY = 442 + title.length * 34 + 8;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full rounded-[10px] border border-line bg-white"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <rect x="25" y="25" width={W - 50} height={H - 50} rx="6" fill="none" stroke="#2152C5" strokeWidth="2" />
      <rect x="32.5" y="32.5" width={W - 65} height={H - 65} rx="3" fill="none" stroke="#CDD2DA" strokeWidth="1" />
      <image href="/brand/ai-edu-gfe-partner.png" x={W / 2 - 220} y="72" width="440" height="44" preserveAspectRatio="xMidYMid meet" />
      <text x={W / 2} y="168" textAnchor="middle" fontSize="15" fontWeight="700" fill="#2152C5" letterSpacing="3.6">
        GIẤY CHỨNG NHẬN
      </text>
      <text x={W / 2} y="218" textAnchor="middle" fontSize="40" fontWeight="700" fill="#172033">
        Hoàn thành khoá học
      </text>
      <text x={W / 2} y="282" textAnchor="middle" fontSize="16" fill="#4B5565">
        Chứng nhận thầy/cô
      </text>
      <text x={W / 2} y="346" textAnchor="middle" fontSize={nameSize} fontWeight="700" fill="#172033">
        {data.fullName || "Họ và tên"}
      </text>
      <line x1={W / 2 - 300} x2={W / 2 + 300} y1="366" y2="366" stroke="#CDD2DA" strokeWidth="1.5" />
      <text x={W / 2} y="404" textAnchor="middle" fontSize="16" fill="#4B5565">
        đã hoàn thành khoá học trực tuyến
      </text>
      {title.map((t, i) => (
        <text key={i} x={W / 2} y={442 + i * 34} textAnchor="middle" fontSize="26" fontWeight="600" fill="#172033">
          {t}
        </text>
      ))}
      <text x={W / 2} y={metaY} textAnchor="middle" fontSize="15" fill="#4B5565">
        {data.meta}
      </text>

      <rect x="97" y="633" width="92" height="92" rx="6" fill="#FFFFFF" stroke="#E3E6EB" />
      {qr ? (
        <svg x="102" y="638" width="82" height="82" viewBox={`0 0 ${qr.n} ${qr.n}`} shapeRendering="crispEdges">
          <path d={qr.d} fill="#172033" />
        </svg>
      ) : (
        <rect x="102" y="638" width="82" height="82" rx="4" fill="#EEF0F3" />
      )}
      <text x="205" y="664" fontSize="13" fill="#4B5565">
        Mã chứng nhận
      </text>
      <text x="205" y="688" fontSize="16" fontWeight="700" fill={data.code ? "#172033" : "#4B5565"} letterSpacing="0.6">
        {data.code ?? "Cấp khi bạn xác nhận"}
      </text>
      {data.verifyUrl && (
        <text x="205" y="710" fontSize="13" fill="#4B5565">
          Xác minh: {data.verifyUrl.replace(/^https?:\/\//, "")}
        </text>
      )}
      <line x1="766" x2="1026" y1="676" y2="676" stroke="#172033" strokeWidth="1" />
      <text x="896" y="700" textAnchor="middle" fontSize="16" fontWeight="600" fill="#172033">
        {data.signerName || "AI Edu"}
      </text>
      <text x="896" y="720" textAnchor="middle" fontSize="13" fill="#4B5565">
        {data.signerTitle || "Đơn vị đào tạo"}
      </text>
    </svg>
  );
}
