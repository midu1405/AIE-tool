import Image from "next/image";
import logo from "@/public/brand/ai-edu.png";
import partner from "@/public/brand/ai-edu-gfe-partner.png";

// Logo do AI Edu cung cấp (public/brand). Ảnh gốc 6163×674, cắt và thu nhỏ bằng PIL; muốn đổi logo thì thay file, giữ tên.

/** Logo AI Edu (biểu tượng + chữ). `height` là chiều cao hiển thị (px). */
export function BrandLogo({ height = 40 }: { height?: number }) {
  return <Image src={logo} alt="AI Edu" height={height} style={{ width: "auto", height }} priority />;
}

/** Logo đối tác: AI Edu × Google for Education Professional Development Partner (dùng ở chân trang). */
export function PartnerLogo({ height = 32 }: { height?: number }) {
  return (
    <Image
      src={partner}
      alt="AI Edu – đối tác đào tạo giáo viên của Google for Education (Google for Education Professional Development Partner)"
      height={height}
      style={{ width: "auto", height, maxWidth: "100%" }}
    />
  );
}
