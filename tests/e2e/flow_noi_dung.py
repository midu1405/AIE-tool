# Khung 3 tầng: nhân viên soạn một khoá (Học phần → Phần → Bước), kiểm tra, xuất bản; giáo viên học từng bước
# (bài đọc, quiz đạt 80%, phản tư, tổng kết); người phụ trách xem câu trả lời phản tư.
import asyncio, os, re, time
from playwright.async_api import async_playwright, expect

B = os.environ.get("E2E_BASE", "http://localhost:3005")
STAFF = open(os.environ.get("E2E_COOKIE_FILE", "cookie.txt")).read()
TEACHER = open(os.environ["E2E_TEACHER_COOKIE_FILE"]).read()
NAME = f"Khoá thử 3 tầng {int(time.time()) % 100000}"


async def ctx_for(b, cookie, w=1280):
    ctx = await b.new_context(viewport={"width": w, "height": 900})
    await ctx.add_cookies([{"name": "sb-localhost-auth-token", "value": cookie, "domain": "localhost", "path": "/"}])
    return ctx


def watch(pg, errs):
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "websocket" not in m.text.lower() else None)
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))


async def add_step(pg, title, kind, mins, fill):
    await pg.get_by_placeholder("Tên bước mới").first.fill(title)
    await pg.get_by_role("button", name="+ Bước").first.click()
    await pg.get_by_role("heading", name=title).wait_for(timeout=10000)
    await pg.select_option("#b-loai", kind)
    await pg.fill("#b-phut", str(mins))
    await fill(pg)
    await pg.get_by_role("button", name="Lưu và đánh dấu sẵn sàng").click()
    await pg.wait_for_timeout(1500)


async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        pg = await (await ctx_for(b, STAFF)).new_page(); watch(pg, errs)
        await pg.goto(B + "/noi-bo/khoa-hoc")
        await pg.get_by_role("button", name="Tạo khoá học").click()
        await pg.fill("#kh-ten", NAME)
        await pg.fill("#kh-tom-tat", "Khoá thử của luồng e2e khung 3 tầng.")
        await pg.get_by_role("button", name="Tạo khoá nháp").click()
        await pg.wait_for_url(re.compile(r".*/noi-bo/khoa-hoc/[0-9a-f-]{36}$"), timeout=15000)
        await pg.get_by_role("tab", name=re.compile("Thông tin trang khoá")).wait_for()
        await pg.fill("#kh-mo-ta", "Đoạn giới thiệu thứ nhất.\n\nĐoạn thứ hai.")
        await pg.fill("#kh-hoc-duoc", "Nêu được A\nLàm được B\nĐánh giá được C")
        await pg.fill("#kh-can-co", "Biết dùng Google Docs")
        await pg.fill("#kh-chuan-bi", "Máy tính có mạng\nWebcam")
        await pg.fill("#kh-danh-cho", "Giáo viên THCS.")
        await pg.fill("#kh-gio-min", "0")
        await pg.fill("#kh-gio-max", "1")
        await pg.get_by_role("button", name="Lưu thông tin").click()
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path="shots/g3b-soan-thong-tin.png", full_page=True)

        await pg.get_by_role("tab", name=re.compile("Nội dung")).click()
        await pg.fill("#hoc-phan-moi", "Tổng quan"); await pg.get_by_role("button", name="+ Học phần").click()
        await pg.get_by_text("Phần: Phần 1").wait_for(timeout=10000)

        async def doc(pg):
            await pg.get_by_role("button", name="Chèn hộp Gợi ý khi dạy").click()
            await pg.keyboard.type("Cho học sinh đoán trước.")
            await pg.fill("#b-noi-dung", "Bước này giúp bạn nắm **mục tiêu**.\n\n## Ý chính\n- Một\n- Hai\n\n[Gợi ý khi dạy] Cho học sinh đoán trước.")
        await add_step(pg, "Đọc mở đầu", "doc", 5, doc)
        await pg.get_by_role("button", name="+ Gắn KHBD/PBT đã duyệt").click()
        await pg.get_by_role("button", name=re.compile(r"^Gắn KHBD")).first.click()
        await pg.get_by_role("button", name=re.compile(r"^Gỡ KHBD")).wait_for(timeout=10000)

        async def quiz(pg):
            for qi, (q, opts, ans) in enumerate([("Mô hình học từ đâu?", ["Từ ví dụ có nhãn", "Từ Internet"], 0), ("AI có hiểu không?", ["Có", "Không, nó dự đoán"], 1)]):
                if qi:
                    await pg.get_by_role("button", name="+ Thêm câu hỏi").click()
                await pg.fill(f"#cau-{qi}", q)
                for oi, o in enumerate(opts):
                    await pg.fill(f"#lc-{qi}-{oi}", o)
                await pg.get_by_label(f"Lựa chọn {ans + 1} của câu {qi + 1} là đáp án đúng").check()
                await pg.fill(f"#giai-thich-{qi}", f"Giải thích câu {qi + 1}.")
        await add_step(pg, "Quiz nhanh", "quiz", 3, quiz)

        async def reflect(pg):
            await pg.fill("#r-cau-hoi", "Lớp bạn sẽ bắt đầu từ đâu?")
            await pg.fill("#r-goi-y", "Nghĩ về học sinh\nNghĩ về thiết bị")
        await add_step(pg, "Phản tư", "reflect", 5, reflect)

        async def end(pg):
            await pg.fill("#e-loi-nhan", "Chúc mừng bạn!")
        await add_step(pg, "Kết thúc học phần 1", "end", 1, end)
        await pg.screenshot(path="shots/g3b-soan-noi-dung.png", full_page=True)

        await pg.get_by_role("tab", name=re.compile("Kiểm tra trước khi xuất bản")).click()
        await pg.wait_for_timeout(500)
        print("checks:", (await pg.get_by_role("tabpanel").inner_text()).replace("\n", " | ")[:700])
        await pg.screenshot(path="shots/g3b-kiem-tra.png", full_page=True)
        await pg.get_by_role("button", name="Xuất bản", exact=True).click()
        await pg.get_by_role("button", name="Ẩn khỏi trang giáo viên").wait_for(timeout=10000)
        slug = (await pg.get_by_text(re.compile(r"/khoa-hoc/[a-z0-9-]+$")).first.inner_text()).split("/khoa-hoc/")[-1]
        studio = pg.url
        print("slug:", slug)

        # ---- giáo viên học
        t = await (await ctx_for(b, TEACHER)).new_page(); watch(t, errs)
        # Khoá minh hoạ (dữ liệu mẫu): có nhãn ở danh mục, trang chi tiết không có nút đăng ký (góp ý P1, 26/11).
        await t.goto(B + "/")
        print("nhãn minh hoạ ở danh mục:", await t.get_by_text("Khoá minh hoạ", exact=True).count())
        await t.goto(B + "/khoa-hoc/hieu-biet-ai")
        await t.get_by_text("AI Edu đang soạn nội dung khoá này").wait_for(timeout=15000)
        assert await t.get_by_role("button", name="Đăng ký học").count() == 0, "khoá minh hoạ vẫn có nút đăng ký"
        await t.screenshot(path="shots/g4-khoa-minh-hoa.png", full_page=True)
        await t.goto(B + f"/khoa-hoc/{slug}")
        await t.get_by_role("button", name="Đăng ký học").click()
        await t.get_by_role("link", name="Bắt đầu học").click()
        await t.get_by_role("heading", name="Đọc mở đầu").wait_for(timeout=15000)
        await t.screenshot(path="shots/g3b-hoc-doc.png", full_page=True)
        print("doc material:", await t.get_by_text("Học liệu kèm bước này").count() > 0)
        await t.get_by_role("button", name="Đánh dấu đã xong và sang bước tiếp").click()
        await t.get_by_role("heading", name="Quiz nhanh").wait_for(timeout=15000)
        await t.get_by_label("Từ Internet").check(); await t.get_by_label("Không, nó dự đoán").check()
        await t.get_by_role("button", name="Nộp bài").click()
        await t.get_by_role("status").filter(has_text="Bạn đúng").wait_for()
        print("quiz 1:", await t.get_by_role("status").filter(has_text="Bạn đúng").inner_text())
        # Chưa đạt: chỉ báo đúng/sai từng câu, không lộ đáp án và giải thích (góp ý P2, 26/11).
        assert await t.get_by_text("Đáp án đúng").count() == 0, "chưa đạt mà lộ đáp án"
        assert await t.get_by_text("Giải thích câu 1.").count() == 0, "chưa đạt mà lộ giải thích"
        print("quiz 1 không lộ đáp án:", await t.get_by_text("Chưa đúng").count(), "câu chưa đúng")
        await t.screenshot(path="shots/g3b-hoc-quiz-sai.png", full_page=True)
        await t.get_by_role("button", name="Làm lại").click()
        await t.get_by_label("Từ ví dụ có nhãn").check(); await t.get_by_label("Không, nó dự đoán").check()
        await t.get_by_role("button", name="Nộp bài").click()
        await t.get_by_text("Bước này đã hoàn thành.").wait_for()
        assert await t.get_by_text("Đáp án đúng").count() == 2 and await t.get_by_text("Giải thích câu 1.").count() == 1, "đạt mà chưa hiện đáp án"
        await t.screenshot(path="shots/g4-quiz-dat.png", full_page=True)
        await t.get_by_role("link", name="Bước tiếp").click()
        await t.get_by_role("heading", name="Phản tư").wait_for(timeout=15000)
        await t.fill("#phan-tu", "Bắt đầu từ trò chơi phân loại lá cây.")
        await t.fill("#link-sp", "https://docs.google.com/document/d/abc")
        await t.get_by_role("button", name="Lưu câu trả lời").click()
        await t.get_by_text("Đã lưu. Bước này được tính là hoàn thành").wait_for()
        await t.get_by_role("link", name="Bước tiếp").click()
        await t.get_by_role("heading", name="Kết thúc học phần 1").wait_for(timeout=15000)
        await t.screenshot(path="shots/g3b-hoc-tong-ket.png", full_page=True)
        await t.get_by_role("button", name="Hoàn thành khoá học").click()
        await t.get_by_text("✓ Đã xong bước này").first.wait_for(timeout=10000)
        await t.goto(B + f"/khoa-hoc/{slug}")
        await t.get_by_text("Tiến độ của bạn").wait_for()
        print("detail box:", (await t.locator("section").first.inner_text()).replace("\n", " | ")[-160:])
        await t.screenshot(path="shots/g3b-chi-tiet.png", full_page=True)
        m = await (await ctx_for(b, TEACHER, 390)).new_page(); watch(m, errs)
        await m.goto(t.url.replace(B, B))
        await m.get_by_role("link", name="Xem lại từ đầu").click()
        await m.get_by_role("heading", name="Đọc mở đầu").wait_for(timeout=15000)
        await m.screenshot(path="shots/g3b-hoc-390.png", full_page=True)
        await t.goto(B + "/khoa-hoc-cua-toi")
        await t.get_by_role("tab", name=re.compile("Đã hoàn thành")).click()
        print("done tab has course:", await t.get_by_text(NAME).count() > 0)

        # ---- menu nội bộ ở 390 px
        n = await (await ctx_for(b, STAFF, 390)).new_page(); watch(n, errs)
        await n.goto(B + "/noi-bo/khoa-hoc"); await n.get_by_role("button", name="Menu").click()
        await n.get_by_role("link", name="Danh sách KHBD").click(); await n.wait_for_url("**/noi-bo/khbd")
        print("menu closed after nav:", not await n.locator("#menu-noi-bo").is_visible())

        # ---- người phụ trách xem phản tư
        await pg.goto(studio)
        await pg.get_by_role("tab", name=re.compile("Nội dung")).click()
        await pg.get_by_role("button", name=re.compile("^Phản tư")).click()
        await pg.get_by_text(re.compile(r"Câu trả lời của giáo viên \(1\)")).click()
        print("reflection seen:", await pg.get_by_text("Bắt đầu từ trò chơi phân loại lá cây.").count() > 0)

        # ---- ẩn khoá: người đã đăng ký vẫn thấy, học tiếp và nhận giấy (góp ý B7, 26/11)
        await pg.get_by_role("tab", name=re.compile("Kiểm tra trước khi xuất bản")).click()
        await pg.get_by_role("button", name="Ẩn khỏi trang giáo viên").click()
        await pg.get_by_role("button", name="Xuất bản lại").wait_for(timeout=10000)
        await t.goto(B + "/khoa-hoc-cua-toi")
        await t.get_by_role("tab", name=re.compile("Đã hoàn thành")).click()
        print("khoá ẩn vẫn ở Khoá học của tôi:", await t.get_by_text("bạn vẫn học tiếp và nhận giấy được").count() > 0)
        await t.screenshot(path="shots/g4-khoa-an-cua-toi.png", full_page=True)
        await t.goto(B + f"/khoa-hoc/{slug}/chung-nhan")
        await t.get_by_role("button", name="Cấp giấy chứng nhận").click()
        await t.get_by_role("heading", name="Giấy chứng nhận đã sẵn sàng").wait_for(timeout=15000)
        print("nhận giấy ở khoá ẩn: OK")
        await pg.get_by_role("button", name="Xuất bản lại").click()
        await pg.get_by_role("button", name="Ẩn khỏi trang giáo viên").wait_for(timeout=10000)
        await b.close()
    print("console errors:", errs)


asyncio.run(main())
