# Repo tham khảo

Lọc từ kho repo của Anh Kỹ Sư AI (https://anhkysuai.com/kho/, 315 repo), đọc ngày 22/11/2026. Chỉ giữ những repo dùng được cho dự án này: worker soạn KHBD, khoá học trên Training Hub, cách làm việc với Claude Code.

Mọi repo dưới đây đã kiểm tra còn trên GitHub. Cột "Đã kiểm" ghi rõ cái gì đã thử thật. Trước khi thêm vào `package.json`, `worker/` hoặc cài cho Claude công ty: đọc license, xem lần cập nhật gần nhất, hỏi Midu. Không dựa vào số sao trên trang nguồn (nhiều số bất thường).

## 1. Worker soạn KHBD: đọc tài liệu nguồn

Bước 1 của job ("đọc bài nguồn") và bước 4 ("kiểm tra 2422/5588") cần đọc file Word, PowerPoint, PDF trên Drive. Service account tải file về (chỉ đọc, xem CLAUDE.md), rồi chuyển sang Markdown cho LLM đọc.

| Repo | License | Đã kiểm | Dùng vào đâu |
|---|---|---|---|
| [microsoft/markitdown](https://github.com/microsoft/markitdown) | MIT | Chạy thử 22/11 trên một KHBD .docx tiếng Việt có bảng 2 cột Hoạt động GV / HS: giữ đúng dấu, tiêu đề, bảng ra bảng Markdown | **Lựa chọn đầu tiên** cho DOCX, PPTX, XLSX, PDF đơn giản. Python: `pip install 'markitdown[docx,pptx,pdf]'`, gọi `MarkItDown().convert(path).text_content`. |
| [docling-project/docling](https://github.com/docling-project/docling) | MIT | Chưa chạy | PDF bố cục phức tạp, nhiều bảng (QĐ 2422, CV 5588 bản scan hoặc PDF dàn trang). Dùng khi markitdown đọc bảng sai. |
| [google/langextract](https://github.com/google/langextract) | Chưa kiểm | Chưa chạy | Trích thông tin có cấu trúc kèm vị trí trong văn bản nguồn. Ý tưởng cho bước "chọn mã 2422": mỗi mã kèm trích đoạn để người duyệt đối chiếu nhanh. |
| [VectifyAI/PageIndex](https://github.com/VectifyAI/PageIndex) | Chưa kiểm | Chưa chạy | Tra cứu văn bản dài theo mục lục, không dùng vector. Để sau. |

Khi chốt executor hướng A (Claude API): xem thêm [anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks) (mẫu tool use, xử lý PDF, trích xuất có cấu trúc).

## 2. Khoá học trên Training Hub

| Repo | License | Dùng vào đâu |
|---|---|---|
| [Huanshere/VideoLingo](https://github.com/Huanshere/VideoLingo) | Apache-2.0 | Tách phụ đề, dịch, lồng tiếng. Giúp làm **bản ghi lời video** (mục đỏ trong danh sách kiểm tra trước khi xuất bản, `lib/steps.ts`). |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | Remotion License (công ty từ một quy mô nhất định phải mua giấy phép) | Video giải thích khái niệm làm bằng React. Hỏi trước khi dùng cho sản phẩm của AI Edu. |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | Chưa kiểm | Video từ HTML, agent viết được, xuất MP4. Thay thế Remotion nếu license không hợp. |
| [microsoft/AI-For-Beginners](https://github.com/microsoft/AI-For-Beginners), [generative-ai-for-beginners](https://github.com/microsoft/generative-ai-for-beginners), [ai-agents-for-beginners](https://github.com/microsoft/ai-agents-for-beginners) | Chưa kiểm | Khoá AI mở có quiz, bài tập. Tham khảo cách chia học phần, độ dài bước, câu quiz khi Academic soạn khoá. |

Bài đọc trong bước dùng Markdown rút gọn (`lib/steps.ts` › `parseDoc`), nên nội dung đã chuyển bằng markitdown dán vào được gần như nguyên (tiêu đề `##`, danh sách `-`; bảng Markdown chưa hỗ trợ).

## 3. Làm việc với Claude Code

| Repo | License | Dùng vào đâu |
|---|---|---|
| [github/spec-kit](https://github.com/github/spec-kit) | MIT | Viết spec trước rồi mới code. Hợp quy trình nhánh + PR: Claude công ty góp ý trên spec trước khi có code. Chưa áp dụng; đề xuất thử ở giai đoạn executor. |
| [luongnv89/claude-howto](https://github.com/luongnv89/claude-howto) | Chưa kiểm | Hướng dẫn Claude Code có hình, tác giả người Việt. Hợp để chia sẻ cho team. |
| [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) | Chưa kiểm | Subagent, hook, CLAUDE.md, vị trí file cấu hình. |
| [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | Chưa kiểm | Một CLAUDE.md giảm lỗi code hay gặp. Đọc để bổ sung "Quy tắc khi code", không chép nguyên. |
| [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp), [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) | Chưa kiểm | Agent tự bấm thử web. Hiện dùng script Playwright ở `tests/e2e/`. |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Chưa kiểm | Lệnh rà giao diện (critique, audit) trước khi mở web cho giáo viên. |

## Không dùng

- Kho system prompt bị lộ (system_prompts_leaks, system-prompts-and-models-of-ai-tools): nguồn không hợp lệ.
- Proxy đổi nhà cung cấp cho Claude Code hoặc bọc CLI thành API (free-claude-code, CLIProxyAPI, cc-switch…): trái nguyên tắc không dùng gói thuê bao cho sản phẩm.
- Skill soạn giáo án / bài giảng của bên thứ ba: CLAUDE.md cấm cài thêm bên cạnh `aca-khbd-ai12`.
