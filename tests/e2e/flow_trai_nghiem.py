# Khoá trải nghiệm (supabase/seed-khoa-trai-nghiem.sql): giáo viên thấy khoá ở đầu danh mục, đăng ký, học trọn 10 bước
# (bài đọc, video, quiz sai rồi làm lại, phản tư, tổng kết), nhận giấy chứng nhận, tải PDF, tra mã ở trang xác minh.
# Cần database đã nạp seed-khoa-trai-nghiem.sql và một giáo viên thử chưa đăng ký khoá này (xem README.md, bước 7).
import asyncio, os, re
from playwright.async_api import async_playwright

B = os.environ.get("E2E_BASE", "http://localhost:3005")
TEACHER = open(os.environ["E2E_TEACHER_COOKIE_FILE"]).read()
SLUG = "trai-nghiem-ai-tao-sinh"
TITLE = "Khoá trải nghiệm: Dùng AI tạo sinh khi soạn bài"
NEXT = "Đánh dấu đã xong và sang bước tiếp"

QUIZ1_WRONG = [
    "Người lập trình viết sẵn từng bước cho mọi trường hợp",
    "Là các ví dụ để mô hình tìm ra mẫu; dữ liệu thiếu hoặc lệch thì kết quả cũng dễ lệch",
    "Tra cứu một cơ sở dữ liệu đáp án đã được kiểm chứng",
    "Mô hình có thể tạo ra nội dung sai trông như thật, nên cần kiểm chứng",
    "Công cụ này tạo ra văn bản dựa trên mẫu trong dữ liệu đã học",
]
QUIZ1 = [
    "Chương trình tìm ra mẫu từ nhiều ví dụ (dữ liệu) thay vì được viết sẵn từng bước",
    "Là các ví dụ để mô hình tìm ra mẫu; dữ liệu thiếu hoặc lệch thì kết quả cũng dễ lệch",
    "Dự đoán lần lượt phần chữ tiếp theo dựa trên mẫu tìm được trong rất nhiều văn bản",
    "Mô hình có thể tạo ra nội dung sai trông như thật, nên cần kiểm chứng",
    "Công cụ này tạo ra văn bản dựa trên mẫu trong dữ liệu đã học",
]
QUIZ2 = [
    "Soạn 5 câu trắc nghiệm về so sánh phân số cho lớp 4, mỗi câu 4 lựa chọn, kèm đáp án, dùng ví dụ quen thuộc với học sinh.",
    "Họ tên, điểm số và hoàn cảnh gia đình của từng học sinh",
    "Mở văn bản gốc trên nguồn chính thức để kiểm tra số hiệu, ngày và nội dung",
    "Giáo viên: công cụ chỉ tạo bản nháp, giáo viên đọc, sửa và quyết định",
    "Nói rõ điều chưa đạt và yêu cầu sửa, ví dụ giảm độ khó, đổi sang ví dụ học sinh gặp hằng ngày",
]


async def answer(t, picks):
    for text in picks:
        await t.get_by_label(text, exact=True).check()
    await t.get_by_role("button", name="Nộp bài").click()


async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 1280, "height": 900})
        await ctx.add_cookies([{"name": "sb-localhost-auth-token", "value": TEACHER, "domain": "localhost", "path": "/"}])
        t = await ctx.new_page()
        t.on("console", lambda m: errs.append(m.text) if m.type == "error" and "websocket" not in m.text.lower() else None)
        t.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))

        await t.goto(B + "/")
        first = t.locator("h3").first
        await first.wait_for(timeout=15000)
        print("thẻ đầu danh mục:", await first.inner_text())
        assert TITLE in await first.inner_text(), "khoá trải nghiệm chưa ở đầu danh mục"
        await t.screenshot(path="shots/g4t-danh-muc.png")

        await t.goto(B + f"/khoa-hoc/{SLUG}")
        await t.get_by_role("button", name="Đăng ký học").click()
        await t.get_by_role("link", name="Bắt đầu học").click()

        await t.get_by_role("heading", name="Cách học khoá này").wait_for(timeout=15000)
        await t.screenshot(path="shots/g4t-buoc-1.png", full_page=True)
        await t.get_by_role("button", name=NEXT).click()

        await t.get_by_role("heading", name="Học máy là gì").wait_for(timeout=15000)
        src = await t.locator("iframe").first.get_attribute("src")
        print("video nhúng:", src)
        assert src and "youtube-nocookie.com/embed/KHbwOetbmbs" in src
        await t.screenshot(path="shots/g4t-video.png", full_page=True)
        await t.get_by_role("button", name=NEXT).click()

        await t.get_by_role("heading", name="Từ dữ liệu đến câu trả lời").wait_for(timeout=15000)
        await t.get_by_role("button", name=NEXT).click()

        await t.get_by_role("heading", name="Kiểm tra nhanh: học máy và AI tạo sinh").wait_for(timeout=15000)
        await answer(t, QUIZ1_WRONG)  # 3/5: chưa đạt
        await t.get_by_role("status").filter(has_text="Bạn đúng").wait_for()
        print("quiz 1 lần đầu:", await t.get_by_role("status").filter(has_text="Bạn đúng").inner_text())
        assert await t.get_by_text("Đáp án đúng", exact=True).count() == 0, "chưa đạt mà lộ đáp án"
        await t.get_by_role("button", name="Làm lại").click()
        await answer(t, QUIZ1)
        await t.get_by_text("Bước này đã hoàn thành.").wait_for()
        await t.screenshot(path="shots/g4t-quiz-dat.png", full_page=True)
        await t.get_by_role("link", name="Bước tiếp").click()

        await t.get_by_role("heading", name="Tổng kết học phần 1").wait_for(timeout=15000)
        await t.get_by_role("button", name="Hoàn thành học phần, sang học phần 2").click()

        await t.get_by_role("heading", name="Viết yêu cầu rõ ràng").wait_for(timeout=15000)
        await t.get_by_role("button", name=NEXT).click()
        await t.get_by_role("heading", name="Kiểm chứng và bảo vệ dữ liệu học sinh").wait_for(timeout=15000)
        await t.screenshot(path="shots/g4t-bai-doc.png", full_page=True)
        await t.get_by_role("button", name=NEXT).click()

        await t.get_by_role("heading", name="Kiểm tra nhanh: dùng AI khi soạn bài").wait_for(timeout=15000)
        await answer(t, QUIZ2)
        await t.get_by_text("Bước này đã hoàn thành.").wait_for()
        await t.get_by_role("link", name="Bước tiếp").click()

        await t.get_by_role("heading", name="Thử với bài dạy của bạn").wait_for(timeout=15000)
        await t.fill("#phan-tu", "Soạn 3 câu hỏi khởi động cho bài Phân số lớp 4. Tôi sẽ kiểm tra lại đáp án và độ khó.")
        await t.get_by_role("button", name="Lưu câu trả lời").click()
        await t.get_by_text("Đã lưu. Bước này được tính là hoàn thành").wait_for()
        await t.screenshot(path="shots/g4t-phan-tu.png", full_page=True)
        await t.get_by_role("link", name="Bước tiếp").click()

        await t.get_by_role("heading", name="Tổng kết khoá").wait_for(timeout=15000)
        await t.get_by_role("button", name="Hoàn thành khoá học").click()
        await t.get_by_text("✓ Đã xong bước này").first.wait_for(timeout=10000)
        await t.screenshot(path="shots/g4t-tong-ket.png", full_page=True)

        await t.goto(B + f"/khoa-hoc/{SLUG}")
        await t.get_by_role("link", name="Nhận giấy chứng nhận").click()
        await t.wait_for_url(f"**/khoa-hoc/{SLUG}/chung-nhan", timeout=15000)
        await t.get_by_role("button", name="Cấp giấy chứng nhận").click()
        await t.get_by_role("heading", name="Giấy chứng nhận đã sẵn sàng").wait_for(timeout=15000)
        code = (await t.locator("dd").filter(has_text=re.compile(r"^AIE-")).first.inner_text()).strip()
        print("mã giấy:", code)
        await t.screenshot(path="shots/g4t-giay-san-sang.png", full_page=True)

        r = await t.request.get(B + f"/chung-nhan/{code}/pdf")
        print("PDF:", r.status, r.headers.get("content-type"), len(await r.body()), "byte")
        assert r.status == 200 and "pdf" in (r.headers.get("content-type") or "")
        open("shots/g4t-giay.pdf", "wb").write(await r.body())

        anon = await (await b.new_context()).new_page()
        await anon.goto(B + f"/chung-nhan/{code}")
        await anon.get_by_text(TITLE).first.wait_for(timeout=15000)
        print("xác minh công khai: OK")
        await anon.screenshot(path="shots/g4t-xac-minh.png", full_page=True)
        await b.close()
    print("console errors:", errs)


asyncio.run(main())
