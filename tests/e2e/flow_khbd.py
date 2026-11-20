import asyncio, os
from playwright.async_api import async_playwright
B=os.environ.get("E2E_BASE", "http://localhost:3005")
COOKIE=open(os.environ.get("E2E_COOKIE_FILE", "cookie.txt")).read()
async def wait_text(pg, text, timeout=40000):
    await pg.get_by_text(text).first.wait_for(timeout=timeout)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width":1280,"height":900})
        await ctx.add_cookies([{"name":"sb-localhost-auth-token","value":COOKIE,"domain":"localhost","path":"/"}])
        pg = await ctx.new_page()
        errs=[]
        pg.on("console", lambda m: errs.append(m.text) if m.type=="error" and "websocket" not in m.text.lower() and "realtime" not in m.text.lower() else None)
        pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
        await pg.goto(B+"/noi-bo/tao-khbd"); await wait_text(pg, "Chọn bài nguồn")
        print("sidebar:", (await pg.locator("aside").inner_text()).replace("\n"," | ")[:300])
        await pg.check("label:has-text('Bài 2. AI là gì?') input"); await pg.check("label:has-text('Bài 3. AI tạo sinh') input")
        await pg.check("#cc-tt02")
        await pg.screenshot(path="shots/g2-tao.png", full_page=True)
        await pg.get_by_role("button", name="Tạo KHBD cho 2 bài").click()
        await pg.wait_for_url("**/noi-bo/tien-do?luot=*", timeout=15000)
        await wait_text(pg, "Đang chạy", 15000)
        await pg.wait_for_timeout(4000)
        await pg.screenshot(path="shots/g2-tiendo-chay.png", full_page=True)
        await wait_text(pg, "Mở để duyệt", 45000)
        await pg.wait_for_timeout(4000)
        print("tien do:", (await pg.locator("main").inner_text()).replace("\n"," | ")[:400])
        await pg.get_by_role("button", name="Xem báo cáo").first.click(); await pg.wait_for_timeout(800)
        await pg.screenshot(path="shots/g2-tiendo-xong.png", full_page=True)

        # lượt có lỗi
        await pg.goto(B+"/noi-bo/tao-khbd"); await wait_text(pg, "Chọn bài nguồn")
        await pg.check("label:has-text('Bài 5. Dữ liệu') input"); await pg.fill("#ghi-chu","thử #loi")
        await pg.get_by_role("button", name="Tạo KHBD cho 1 bài").click()
        await pg.wait_for_url("**/noi-bo/tien-do?luot=*", timeout=15000)
        await wait_text(pg, "Chạy lại từ bước lỗi", 45000)
        await pg.screenshot(path="shots/g2-loi.png", full_page=True)
        await pg.get_by_role("button", name="Chạy lại từ bước lỗi").click()
        await wait_text(pg, "Mở để duyệt", 45000)
        print("retry ok")

        # danh sách
        await pg.goto(B+"/noi-bo/khbd"); await wait_text(pg, "Danh sách KHBD")
        await pg.wait_for_timeout(800)
        print("list:", (await pg.locator("table").inner_text()).replace("\n"," | ")[:500])
        await pg.screenshot(path="shots/g2-ds.png", full_page=True)

        # duyệt: góp ý + trả về
        await pg.get_by_role("link", name="Bài 2. AI là gì?").click(); await wait_text(pg, "Checklist QĐ 2422")
        await pg.screenshot(path="shots/g2-duyet.png", full_page=True)
        await pg.get_by_role("tab", name="Rubric").click(); 
        for i,lbl in enumerate(["1. Nội dung kiến thức","2. Hoạt động học tập"]):
            await pg.get_by_role("group", name=lbl).get_by_role("button", name="3").click()
        print("score:", await pg.get_by_text("điểm ·").first.inner_text())
        await pg.get_by_role("tab", name="Góp ý").click()
        await pg.select_option("#cho-gop-y", label="Hoạt động 2. Hình thành kiến thức")
        await pg.fill("#gop-y","Cần ví dụ gần gũi hơn"); await pg.get_by_role("button", name="Lưu góp ý").click()
        await wait_text(pg, "Cần ví dụ gần gũi hơn", 10000)
        await pg.get_by_role("button", name="Trả về, soạn bản v2 theo 1 góp ý").click()
        await wait_text(pg, "Đã trả về", 10000)
        await pg.get_by_role("link", name="Xem tiến độ").click()
        await wait_text(pg, "Mở để duyệt", 45000)
        await pg.get_by_role("link", name="Mở để duyệt").first.click()
        await wait_text(pg, "Duyệt KHBD v2", 15000)
        await pg.get_by_role("button", name="Duyệt KHBD v2").click()
        await wait_text(pg, "Đã duyệt KHBD v2", 10000)
        await pg.screenshot(path="shots/g2-daduyet.png", full_page=True)
        await pg.select_option("#ban", value="1"); await wait_text(pg, "Đang xem bản cũ v1", 10000)
        await pg.get_by_role("tab", name="Góp ý").click()
        print("v1 notes:", (await pg.locator("#tab-notes").inner_text()).replace("\n"," | ")[:300])

        # bài mới
        await pg.goto(B+"/noi-bo/tao-khbd"); await wait_text(pg, "Chọn bài nguồn")
        await pg.get_by_role("button", name="Soạn bài mới").click()
        await pg.select_option("#lop", "3"); print("lop3 btn:", await pg.locator("button.min-h-12").last.inner_text())
        await pg.select_option("#lop", "8"); await pg.fill("#ten-bai","Dữ liệu di chuyển như thế nào?")
        await pg.check("#ma-manual"); await pg.fill("#ma-tu-chon","8.C1.1, 7.C2.1")
        print("bad code:", await pg.get_by_role("alert").first.inner_text())
        await pg.fill("#ma-tu-chon","8.C1.1, 8.C1.2")
        await pg.screenshot(path="shots/g2-moi.png", full_page=True)
        await pg.get_by_role("button", name="Soạn bài mới").last.click()
        await pg.wait_for_url("**/noi-bo/tien-do?luot=*", timeout=15000)
        await wait_text(pg, "Mở để duyệt", 45000); print("bai moi ok")

        # duyet-bai queue + mobile
        await pg.goto(B+"/noi-bo/duyet-bai"); await pg.wait_for_timeout(1000)
        print("queue:", (await pg.locator("table tbody").inner_text()).replace("\n"," | ")[:300])
        m = await ctx.new_page(); await m.set_viewport_size({"width":390,"height":844})
        await m.goto(B+"/noi-bo/khbd"); await m.wait_for_timeout(1000)
        await m.screenshot(path="shots/g2-ds-390.png")
        print("console errors:", errs[:6])
        await b.close()
asyncio.run(main())
