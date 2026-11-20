import { Icon } from "@/components/Icon";
import { parseDoc, type Inline } from "@/lib/steps";

// Hiển thị bài đọc từ Markdown rút gọn (lib/steps.ts parseDoc). Chỉ dựng phần tử React, không chèn HTML.
export function DocBody({ text }: { text: string | undefined }) {
  const blocks = parseDoc(text);
  if (blocks.length === 0) return <p className="text-muted">Bước này chưa có nội dung.</p>;
  return (
    <div className="flex max-w-[720px] flex-col gap-[18px] text-base leading-[1.75]">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p":
            return (
              <p key={i}>
                <Inl xs={b.inl} />
              </p>
            );
          case "h":
            return (
              <h2 key={i} className="mt-2 text-xl font-bold">
                <Inl xs={b.inl} />
              </h2>
            );
          case "ul":
          case "ol": {
            const L = b.t;
            return (
              <L key={i} className={`flex flex-col gap-1.5 pl-[22px] ${b.t === "ul" ? "list-disc" : "list-decimal"}`}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inl xs={it} />
                  </li>
                ))}
              </L>
            );
          }
          case "tip":
            return (
              <div key={i} className="flex gap-3 rounded-[10px] bg-accent-soft px-[18px] py-4">
                <Icon d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" size={22} stroke="#163B91" className="mt-[3px] flex-none" />
                <div className="flex flex-col gap-1">
                  <strong className="text-[15px] text-accent-dark">Gợi ý khi dạy</strong>
                  <span className="text-[15px] leading-relaxed">
                    <Inl xs={b.inl} />
                  </span>
                </div>
              </div>
            );
          case "avoid":
            return (
              <div key={i} className="flex gap-3 rounded-[10px] bg-err-soft px-[18px] py-4">
                <Icon d="M12 3l9 16H3zM12 10v4M12 17h.01" size={22} stroke="#8A3A0C" className="mt-[3px] flex-none" />
                <div className="flex flex-col gap-1">
                  <strong className="text-[15px] text-err">Tránh</strong>
                  <span className="text-[15px] leading-relaxed">
                    <Inl xs={b.inl} />
                  </span>
                </div>
              </div>
            );
          case "img":
            return (
              <figure key={i} className="flex flex-col gap-2">
                {/* Ảnh ngoài do người soạn dán link; kích thước không biết trước nên dùng <img>. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.src} alt={b.alt} loading="lazy" className="max-w-full rounded-[10px] border border-line" />
                {b.alt && <figcaption className="text-sm text-muted">{b.alt}</figcaption>}
              </figure>
            );
        }
      })}
    </div>
  );
}

function Inl({ xs }: { xs: Inline[] }) {
  return (
    <>
      {xs.map((x, i) =>
        x.t === "b" ? (
          <strong key={i}>{x.v}</strong>
        ) : x.t === "i" ? (
          <em key={i}>{x.v}</em>
        ) : x.t === "a" ? (
          <a key={i} href={x.href} target="_blank" rel="noreferrer">
            {x.v}
          </a>
        ) : (
          <span key={i}>{x.v}</span>
        ),
      )}
    </>
  );
}
