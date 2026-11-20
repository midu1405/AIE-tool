# Giai đoạn 3: quản lý khoá (nhân viên) rồi học (giáo viên). Cần đã chạy flow_khbd.py để có KHBD đã duyệt.
import asyncio, os, re
from playwright.async_api import async_playwright
B = os.environ.get("E2E_BASE", "http://localhost:3005")
STAFF = open(os.environ.get("E2E_COOKIE_FILE", "cookie.txt")).read()
TEACHER = open(os.environ["E2E_TEACHER_COOKIE_FILE"]).read()

async def ctx_for(b, cookie, w=1280):
    ctx = await b.new_context(viewport={"width": w, "height": 900})
    await ctx.add_cookies([{"name": "sb-localhost-auth-token", "value": cookie, "domain": "localhost", "path": "/"}])
    return ctx

def watch(pg, errs):
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "websocket" not in m.text.lower() else None)
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        # ---- nhân viên: tạo khoá nháp, học phần, bài, gắn KHBD đã duyệt, xuất bản
        pg = await (await ctx_for(b, STAFF)).new_page(); watch(pg, errs)
        await pg.goto(B + "/noi-bo/khoa-hoc"); await pg.get_by_role("button", name="Tạo khoá học").wait_for()
        await pg.screenshot(path="shots/g3-ql-danh-sach.png", full_page=True)
        await pg.get_by_role("button", name="Tạo khoá học").click()
        await pg.fill("#kh-ten", "Thử nghiệm dạy Bài 2 lớp 6")
        await pg.fill("#kh-tom-tat", "Khoá thử của luồng e2e.")
        await pg.get_by_role("button", name="Tạo khoá nháp").click()
        await pg.wait_for_url(re.compile(r".*/noi-bo/khoa-hoc/[0-9a-f-]{36}$"), timeout=15000)
        await pg.fill("#hoc-phan-moi", "Chuẩn bị"); await pg.get_by_role("button", name="Thêm học phần").click()
        await pg.get_by_placeholder("Tên bài mới").first.wait_for()
        await pg.get_by_placeholder("Tên bài mới").first.fill("Đọc KHBD mẫu")
        await pg.get_by_role("button", name="Thêm bài").first.click()
        await pg.get_by_text("Đọc KHBD mẫu").first.wait_for(); await pg.wait_for_timeout(500)
        await pg.get_by_placeholder("Tên bài mới").first.fill("Dạy thử")
        await pg.get_by_role("button", name="Thêm bài").first.click()
        await pg.get_by_text("Dạy thử").first.wait_for(); await pg.wait_for_timeout(500)
        await pg.get_by_text("+ Gắn học liệu").first.wait_for()
        await pg.get_by_text("+ Gắn học liệu").first.click()
        await pg.get_by_role("button", name=re.compile(r"^Gắn KHBD")).first.click()
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path="shots/g3-ql-sua.png", full_page=True)
        await pg.get_by_role("button", name="Xuất bản", exact=True).click()
        await pg.get_by_role("button", name="Ẩn khỏi trang giáo viên").wait_for(timeout=10000)
        slug = (await pg.get_by_text(re.compile(r"^/khoa-hoc/")).first.inner_text()).split("/")[-1]
        print("slug:", slug)
        # danh mục công khai thấy khoá vừa xuất bản
        await pg.goto(B + "/"); await pg.wait_for_timeout(800)
        print("catalog has new course:", await pg.get_by_text("Thử nghiệm dạy Bài 2 lớp 6").count() > 0)
        # menu nội bộ ở 390 px
        m = await (await ctx_for(b, STAFF, 390)).new_page(); watch(m, errs)
        await m.goto(B + "/noi-bo/khoa-hoc"); await m.get_by_role("button", name="Menu").wait_for()
        await m.screenshot(path="shots/g3-mobile-dong.png")
        await m.get_by_role("button", name="Menu").click(); await m.wait_for_timeout(300)
        await m.screenshot(path="shots/g3-mobile-mo.png")
        await m.get_by_role("link", name="Danh sách KHBD").click(); await m.wait_for_url("**/noi-bo/khbd")
        print("menu closed after nav:", not await m.locator("#menu-noi-bo").is_visible())

        # ---- giáo viên: chi tiết khoá, đăng ký, đánh dấu bài, học liệu, lưu, Khoá học của tôi
        t = await (await ctx_for(b, TEACHER)).new_page(); watch(t, errs)
        await t.goto(B + f"/khoa-hoc/{slug}"); await t.get_by_role("button", name="Đăng ký học").wait_for(timeout=15000)
        await t.screenshot(path="shots/g3-ct-chua-dk.png", full_page=True)
        print("material before enroll:", (await t.locator("#noi-dung").inner_text()).replace("\n", " | ")[:300])
        await t.get_by_role("button", name="Đăng ký học").click()
        await t.get_by_text("Tiến độ của bạn").wait_for()
        await t.get_by_label("Đọc KHBD mẫu").check(); await t.wait_for_timeout(1000)
        print("progress after 1/2:", await t.get_by_role("progressbar").get_attribute("aria-valuenow"))
        await t.get_by_label("Dạy thử").check(); await t.wait_for_timeout(1200)
        print("box:", (await t.locator("section").first.inner_text()).replace("\n", " | ")[-160:])
        await t.get_by_role("button", name="Lưu để học sau").click(); await t.get_by_role("button", name="Đã lưu vào danh sách").wait_for()
        await t.screenshot(path="shots/g3-ct-xong.png", full_page=True)
        # đăng ký thêm một khoá có sẵn, học dở
        await t.goto(B + "/khoa-hoc/gd-ai-thcs"); await t.get_by_role("button", name="Đăng ký học").click()
        await t.get_by_text("Tiến độ của bạn").wait_for()
        await t.locator("#noi-dung input[type=checkbox]").first.check(); await t.wait_for_timeout(1000)
        await t.goto(B + "/khoa-hoc-cua-toi"); await t.get_by_role("tab", name=re.compile("Đang học")).wait_for()
        for name in ["Đang học", "Đã hoàn thành", "Đã lưu"]:
            await t.get_by_role("tab", name=re.compile(name)).click(); await t.wait_for_timeout(300)
            print(name, "→", (await t.locator("main").inner_text()).replace("\n", " | ")[:220])
            await t.screenshot(path=f"shots/g3-cua-toi-{name.replace(' ', '-')}.png", full_page=True)
        n = await (await ctx_for(b, TEACHER, 390)).new_page(); watch(n, errs)
        await n.goto(B + "/khoa-hoc/gd-ai-thcs"); await n.get_by_text("Tiến độ của bạn").wait_for()
        await n.screenshot(path="shots/g3-ct-390.png", full_page=True)
        # giáo viên không vào được khu nội bộ
        await t.goto(B + "/noi-bo/khoa-hoc"); await t.wait_for_timeout(800)
        print("teacher blocked:", await t.get_by_text("Tài khoản chưa có quyền vào khu nội bộ").count() > 0)
        await b.close()
    print("console errors:", errs)

asyncio.run(main())
