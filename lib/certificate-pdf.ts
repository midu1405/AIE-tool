import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import QRCode from "qrcode";
import { certMeta, type Certificate } from "@/lib/certificate";

// Vẽ giấy chứng nhận theo artboard ChungNhan trên canvas (A4 ngang 1123×794 px).
// Toạ độ viết theo px của artboard (gốc trên-trái) rồi đổi sang point của PDF (gốc dưới-trái).
// Font và logo nằm ở assets/certificate (next.config.ts đưa vào bản build của route PDF).

const W = 1123;
const H = 794;
const K = 0.75; // 1 px = 0.75 pt
const ASSETS = path.join(process.cwd(), "assets", "certificate");

const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const INK = hex("#172033");
const MUTED = hex("#4B5565");
const EDGE = hex("#CDD2DA");
const LINE = hex("#E3E6EB");
const ACCENT = hex("#2152C5");

type Fonts = { regular: PDFFont; semibold: PDFFont; bold: PDFFont };

/** Chữ ký: đặt tên và chức danh người ký trong biến môi trường khi đã chốt. */
export function certSigner() {
  return {
    name: process.env.CERTIFICATE_SIGNER_NAME?.trim() || "AI Edu",
    title: process.env.CERTIFICATE_SIGNER_TITLE?.trim() || "Đơn vị đào tạo",
  };
}

class Canvas {
  constructor(
    private page: PDFPage,
    private f: Fonts,
  ) {}

  width(text: string, font: PDFFont, size: number, tracking = 0) {
    return font.widthOfTextAtSize(text, size * K) / K + tracking * Math.max(0, [...text].length - 1);
  }

  /** Vẽ chữ với đường chân chữ tại y (px). align: căn theo x. */
  text(text: string, x: number, y: number, size: number, font: PDFFont, color: RGB, align: "left" | "center" = "left", tracking = 0) {
    const w = this.width(text, font, size, tracking);
    let cx = align === "center" ? x - w / 2 : x;
    if (!tracking) {
      this.page.drawText(text, { x: cx * K, y: (H - y) * K, size: size * K, font, color });
      return;
    }
    for (const ch of text) {
      this.page.drawText(ch, { x: cx * K, y: (H - y) * K, size: size * K, font, color });
      cx += font.widthOfTextAtSize(ch, size * K) / K + tracking;
    }
  }

  /** Ngắt dòng theo từ cho vừa maxW. */
  wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
    const out: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && this.width(next, font, size) > maxW) {
        out.push(line);
        line = word;
      } else line = next;
    }
    if (line) out.push(line);
    return out;
  }

  /** Cỡ chữ lớn nhất (≤ size) để text nằm gọn trong maxW. */
  fit(text: string, font: PDFFont, size: number, maxW: number, min: number) {
    let s = size;
    while (s > min && this.width(text, font, s) > maxW) s -= 1;
    return s;
  }

  roundRect(x: number, y: number, w: number, h: number, r: number, color: RGB, thickness: number) {
    const p = `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
    // drawSvgPath đặt gốc toạ độ SVG (trên-trái) tại điểm x, y truyền vào.
    this.page.drawSvgPath(p, { x: 0, y: H * K, scale: K, borderColor: color, borderWidth: thickness * K });
  }

  line(x1: number, y: number, x2: number, color: RGB, thickness: number) {
    this.page.drawLine({ start: { x: x1 * K, y: (H - y) * K }, end: { x: x2 * K, y: (H - y) * K }, thickness: thickness * K, color });
  }

  rectFill(x: number, y: number, w: number, h: number, color: RGB) {
    this.page.drawRectangle({ x: x * K, y: (H - y - h) * K, width: w * K, height: h * K, color });
  }
}

export async function renderCertificatePdf(cert: Certificate, verifyUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Giấy chứng nhận – ${cert.full_name} – ${cert.course_title}`);
  pdf.setAuthor("AI Edu Training Hub");
  pdf.setSubject(`Mã chứng nhận ${cert.code}`);
  pdf.setLanguage("vi-VN");

  const [regular, semibold, bold, logoBytes] = await Promise.all([
    readFile(path.join(ASSETS, "BeVietnamPro-Regular.ttf")),
    readFile(path.join(ASSETS, "BeVietnamPro-SemiBold.ttf")),
    readFile(path.join(ASSETS, "BeVietnamPro-Bold.ttf")),
    readFile(path.join(ASSETS, "ai-edu-gfe-partner.png")),
  ]);
  const f: Fonts = {
    regular: await pdf.embedFont(regular, { subset: true }),
    semibold: await pdf.embedFont(semibold, { subset: true }),
    bold: await pdf.embedFont(bold, { subset: true }),
  };
  const logo = await pdf.embedPng(logoBytes);
  const page = pdf.addPage([W * K, H * K]);
  const c = new Canvas(page, f);
  const mid = W / 2;

  // Khung đôi.
  c.roundRect(25, 25, W - 50, H - 50, 6, ACCENT, 2);
  c.roundRect(32.5, 32.5, W - 65, H - 65, 3, EDGE, 1);

  // Logo AI Edu × Google for Education ở giữa.
  const lh = 44;
  const lw = (logo.width / logo.height) * lh;
  page.drawImage(logo, { x: (mid - lw / 2) * K, y: (H - 72 - lh) * K, width: lw * K, height: lh * K });

  c.text("GIẤY CHỨNG NHẬN", mid, 168, 15, f.bold, ACCENT, "center", 3.6);
  c.text("Hoàn thành khoá học", mid, 218, 40, f.bold, INK, "center");

  c.text("Chứng nhận thầy/cô", mid, 282, 16, f.regular, MUTED, "center");
  const nameSize = c.fit(cert.full_name, f.bold, 50, 900, 28);
  c.text(cert.full_name, mid, 346, nameSize, f.bold, INK, "center");
  const ruleW = Math.max(560, c.width(cert.full_name, f.bold, nameSize) + 64);
  c.line(mid - ruleW / 2, 366, mid + ruleW / 2, EDGE, 1.5);

  c.text("đã hoàn thành khoá học trực tuyến", mid, 404, 16, f.regular, MUTED, "center");
  const titleSize = c.fit(cert.course_title, f.semibold, 26, 820 * 2, 20);
  const titleLines = c.wrap(cert.course_title, f.semibold, titleSize, 820).slice(0, 2);
  let y = 442;
  for (const ln of titleLines) {
    c.text(ln, mid, y, titleSize, f.semibold, INK, "center");
    y += titleSize * 1.3;
  }
  c.text(certMeta(cert), mid, y + 8, 15, f.regular, MUTED, "center");

  // Góc dưới trái: QR + mã.
  const qr = QRCode.create(verifyUrl, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const box = { x: 97, y: 633, s: 92 };
  c.roundRect(box.x, box.y, box.s, box.s, 6, LINE, 1);
  const cell = (box.s - 10) / n;
  for (let r = 0; r < n; r++)
    for (let col = 0; col < n; col++)
      if (qr.modules.get(r, col)) c.rectFill(box.x + 5 + col * cell, box.y + 5 + r * cell, cell + 0.05, cell + 0.05, INK);
  const tx = box.x + box.s + 16;
  c.text("Mã chứng nhận", tx, 664, 13, f.regular, MUTED);
  c.text(cert.code, tx, 688, 16, f.bold, INK, "left", 0.6);
  c.text(`Xác minh: ${verifyUrl.replace(/^https?:\/\//, "")}`, tx, 710, 13, f.regular, MUTED);

  // Góc dưới phải: người ký (chừa chỗ chữ ký phía trên đường kẻ).
  const s = certSigner();
  const sx = 1026 - 260;
  c.line(sx, 676, 1026, INK, 1);
  c.text(s.name, sx + 130, 700, 16, f.semibold, INK, "center");
  c.text(s.title, sx + 130, 720, 13, f.regular, MUTED, "center");

  return pdf.save();
}
