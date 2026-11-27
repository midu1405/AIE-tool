-- Khoá trải nghiệm: một khoá thật, học trọn được tới giấy chứng nhận, để giáo viên và đồng nghiệp thử web và góp ý
-- (Midu yêu cầu 27/11). Khác 9 khoá minh hoạ của seed.sql: không phải is_demo, mọi bước có nội dung, quiz có đáp án và giải
-- thích, video có bản tóm tắt lời. 2 học phần, 10 bước, khoảng 45 phút.
--
-- Chạy bằng tài khoản quản trị database (SQL editor hoặc psql), không qua API. Chạy lại được: đã có slug thì bỏ qua.
-- Phần 1 tạo khoá ở trạng thái nháp. Phần 2 xuất bản, chỉ khi course_problems() không còn mục đỏ (cùng điều kiện với nút
-- Xuất bản), và chỉ khi khoá chưa từng xuất bản: khoá đã bị ẩn có chủ đích sẽ không bị xuất bản lại.
--
-- Sửa nội dung về sau: dùng màn Soạn nội dung khoá (/noi-bo/khoa-hoc/[id]), không chạy lại file này.
begin;

create function pg_temp.buoc(p_section uuid, p_pos int, p_title text, p_kind text, p_mins int, p_body jsonb)
returns uuid language plpgsql as $f$
declare l uuid;
begin
  insert into public.course_lessons (section_id, position, title, kind, ready, duration_minutes)
  values (p_section, p_pos, p_title, p_kind, true, p_mins)
  returning id into l;
  insert into public.lesson_contents (lesson_id, body) values (l, p_body);
  return l;
end $f$;

do $seed$
declare
  c uuid; m uuid; s uuid; l uuid;
begin
  if exists (select 1 from public.courses where slug = 'trai-nghiem-ai-tao-sinh') then
    raise notice 'Đã có khoá trai-nghiem-ai-tao-sinh, bỏ qua.';
    return;
  end if;

  insert into public.courses (slug, title, summary, description, topic, audiences, hours_min, hours_max, format, level,
                              outcomes, audience_note, prerequisites, materials_needed, status)
  values (
    'trai-nghiem-ai-tao-sinh',
    'Khoá trải nghiệm: Dùng AI tạo sinh khi soạn bài',
    'Khoá ngắn khoảng 45 phút: AI tạo sinh tạo ra câu trả lời thế nào, vì sao có thể sai, cách giao việc rõ ràng và kiểm chứng trước khi đưa vào lớp.',
    'Đây là khoá trải nghiệm để bạn đi thử trọn một khoá trên AI Edu Training Hub: đọc bài, xem video, làm quiz, viết phản tư, rồi nhận giấy chứng nhận khi xong mọi bước. Nội dung ngắn nhưng dùng được ngay khi soạn bài: AI tạo sinh tạo ra câu trả lời như thế nào, vì sao câu trả lời có thể sai, cách viết yêu cầu rõ ràng, cách kiểm chứng kết quả và giữ an toàn dữ liệu của học sinh.',
    'teach',
    array['th', 'thcs', 'thpt', 'ql']::text[],
    0.5, 1, 'self', 'basic',
    array[
      'Giải thích ngắn gọn học máy là gì và AI tạo sinh tạo ra câu trả lời như thế nào',
      'Nêu được vì sao câu trả lời của AI tạo sinh có thể sai',
      'Viết một yêu cầu rõ ràng cho công cụ AI khi soạn bài',
      'Kiểm chứng bản nháp do AI tạo trước khi dùng trong lớp',
      'Biết thông tin nào của học sinh không đưa vào công cụ AI'
    ]::text[],
    'Mọi giáo viên và cán bộ quản lý muốn thử web, hoặc mới bắt đầu dùng AI tạo sinh khi soạn bài. Không cần kiến thức kỹ thuật.',
    array['Biết dùng trình duyệt web']::text[],
    array[
      'Máy tính hoặc điện thoại có kết nối mạng',
      'Loa hoặc tai nghe để xem video (video có phụ đề)',
      'Một bài bạn sắp dạy, để làm bước phản tư'
    ]::text[],
    'draft'
  )
  returning id into c;

  -- ============================================================ Học phần 1
  insert into public.course_modules (course_id, position, title)
  values (c, 0, 'AI tạo sinh tạo ra câu trả lời như thế nào') returning id into m;

  insert into public.course_sections (module_id, position, title) values (m, 0, 'Bắt đầu') returning id into s;

  perform pg_temp.buoc(s, 0, 'Cách học khoá này', 'doc', 3, jsonb_build_object('text', $t$## Chào mừng bạn
Đây là khoá trải nghiệm của AI Edu Training Hub. Khoá có 2 học phần, khoảng 45 phút, để bạn đi thử trọn một khoá: đọc bài, xem video, làm quiz, viết phản tư và nhận giấy chứng nhận.

## Cách học
- Học xong một bài đọc hoặc video, bấm **Đánh dấu đã xong** để lưu tiến độ.
- Quiz đạt khi đúng ít nhất 80% số câu. Chưa đạt thì bạn biết câu nào đúng, câu nào sai và làm lại được, không giới hạn số lần. Đạt rồi mới xem đáp án và giải thích.
- Bước phản tư tính xong khi bạn bấm **Lưu câu trả lời**.
- Tiến độ lưu theo tài khoản. Lần sau vào **Khoá học của tôi** để học tiếp.
- Xong mọi bước, trang khoá học hiện nút **Nhận giấy chứng nhận**. Bạn xác nhận họ tên in trên giấy rồi tải bản PDF.

## Góp ý
Khoá này dùng để thử web. Chỗ nào khó dùng, chữ nào khó hiểu hay nội dung nào chưa đúng, bạn ghi lại và gửi cho AI Edu.$t$));

  perform pg_temp.buoc(s, 1, 'Học máy là gì', 'video', 6, jsonb_build_object(
    'url', 'https://www.youtube.com/watch?v=KHbwOetbmbs',
    'intro', 'Video ngắn của Code.org trong loạt “How AI Works”, nói bằng tiếng Anh. Cần phụ đề tiếng Việt thì bật phụ đề, vào Cài đặt › Phụ đề và chọn tự động dịch sang Tiếng Việt.',
    'watch', $t$- Máy học từ đâu?
- Học máy khác cách viết chương trình từng bước ở chỗ nào?
- Bạn đã gặp học máy ở đâu trong một ngày bình thường?$t$,
    'transcript', $t$Tóm tắt nội dung video (không phải bản ghi nguyên văn; xem đủ lời bằng phụ đề trên YouTube):
- Người nói: một quản lý sản phẩm của nhóm Alexa (Amazon) và một nhà nghiên cứu ở Viện Allen về Trí tuệ nhân tạo (AI2).
- Máy tính đã tham gia vào nhiều quyết định hằng ngày, như kết quả tìm kiếm trên mạng và bài viết hiện trên mạng xã hội.
- Dạng AI được dùng nhiều nhất hiện nay là học máy: chương trình tìm ra mẫu trong dữ liệu, thay vì được viết sẵn từng bước cho mọi trường hợp.
- Con người học từ kinh nghiệm; với học máy, kinh nghiệm đó là dữ liệu.
- AI và học máy ngày càng ảnh hưởng tới xã hội, nên ai cũng nên hiểu chúng hoạt động thế nào.$t$,
    'captions', true));

  insert into public.course_sections (module_id, position, title) values (m, 1, 'AI tạo sinh') returning id into s;

  perform pg_temp.buoc(s, 0, 'Từ dữ liệu đến câu trả lời', 'doc', 6, jsonb_build_object('text', $t$## AI tạo sinh là gì
AI tạo sinh là các công cụ tạo ra nội dung mới như văn bản, hình ảnh hay âm thanh từ một yêu cầu viết bằng lời. Các chatbot viết văn bản là ví dụ quen thuộc nhất.

## Công cụ tạo câu trả lời thế nào
1. Mô hình được huấn luyện trên rất nhiều văn bản để tìm ra mẫu: chữ nào hay đi với chữ nào, một câu thường được viết ra sao.
2. Khi bạn gửi yêu cầu, mô hình dự đoán phần chữ tiếp theo phù hợp nhất, rồi lặp lại cho tới khi xong câu trả lời.
3. Vì vậy câu trả lời thường trôi chảy. Nhưng trôi chảy không có nghĩa là đúng.

## Vì sao câu trả lời có thể sai
- Mô hình dự đoán theo mẫu, không tra cứu một kho đáp án đã được kiểm chứng.
- Dữ liệu huấn luyện có thể cũ, thiếu hoặc lệch, nhất là với chương trình và văn bản của Việt Nam.
- Mô hình có thể tạo ra nội dung sai trông như thật, thường gọi là “ảo giác”: số liệu, tên sách hay số hiệu văn bản không có thật.

[Tránh] Nói với học sinh rằng AI “hiểu”, “nghĩ” hay “biết”. Nên nói công cụ “tạo ra”, “dự đoán” dựa trên dữ liệu.

[Gợi ý khi dạy] Cho học sinh gửi cùng một câu hỏi hai lần rồi so sánh hai câu trả lời: các em sẽ thấy kết quả là dự đoán và có thể khác nhau mỗi lần.$t$));

  l := pg_temp.buoc(s, 1, 'Kiểm tra nhanh: học máy và AI tạo sinh', 'quiz', 5, jsonb_build_object('questions', jsonb_build_array(
    jsonb_build_object('text', 'Học máy khác cách viết chương trình thông thường ở điểm nào?', 'options', jsonb_build_array(
      'Người lập trình viết sẵn từng bước cho mọi trường hợp',
      'Chương trình tìm ra mẫu từ nhiều ví dụ (dữ liệu) thay vì được viết sẵn từng bước',
      'Máy tính có suy nghĩ và cảm xúc như con người',
      'Chương trình chỉ chạy được khi có mạng Internet')),
    jsonb_build_object('text', 'Trong học máy, dữ liệu huấn luyện có vai trò gì?', 'options', jsonb_build_array(
      'Là các ví dụ để mô hình tìm ra mẫu; dữ liệu thiếu hoặc lệch thì kết quả cũng dễ lệch',
      'Chỉ để trang trí giao diện của phần mềm',
      'Không quan trọng, vì mô hình đã có sẵn đáp án đúng')),
    jsonb_build_object('text', 'Một chatbot AI tạo sinh tạo ra câu trả lời bằng cách nào?', 'options', jsonb_build_array(
      'Tra cứu một cơ sở dữ liệu đáp án đã được kiểm chứng',
      'Dự đoán lần lượt phần chữ tiếp theo dựa trên mẫu tìm được trong rất nhiều văn bản',
      'Hỏi một nhóm chuyên gia trước khi trả lời',
      'Chép nguyên văn một trang web')),
    jsonb_build_object('text', 'AI tạo sinh trích một văn bản pháp quy nghe rất thuyết phục nhưng văn bản đó không có thật. Điều này nói lên gì?', 'options', jsonb_build_array(
      'Công cụ cố tình lừa người dùng',
      'Chỉ xảy ra khi mạng chậm',
      'Mô hình có thể tạo ra nội dung sai trông như thật, nên cần kiểm chứng',
      'Không xảy ra nếu hỏi bằng tiếng Việt')),
    jsonb_build_object('text', 'Câu nào nói về AI đúng cách, không nhân hoá AI?', 'options', jsonb_build_array(
      'AI hiểu và quan tâm tới học sinh',
      'AI biết mọi thứ nên luôn đúng',
      'AI đã suy nghĩ kỹ trước khi trả lời',
      'Công cụ này tạo ra văn bản dựa trên mẫu trong dữ liệu đã học'))
  )));
  insert into public.quiz_keys (lesson_id, answers, explains) values (l, array[1, 0, 1, 2, 3], array[
    'Với học máy, người làm hệ thống đưa vào nhiều ví dụ; chương trình tìm ra mẫu trong các ví dụ đó rồi dùng mẫu để dự đoán với dữ liệu mới. Máy không có suy nghĩ hay cảm xúc.',
    'Mô hình chỉ “thấy” những gì có trong dữ liệu huấn luyện. Dữ liệu thiếu một nhóm người hoặc lệch về một phía thì dự đoán cũng lệch theo.',
    'Chatbot không tra một kho đáp án. Nó dự đoán phần chữ tiếp theo hợp với mẫu đã học, nên câu trả lời trôi chảy nhưng có thể sai.',
    'Đây là hiện tượng thường gọi là “ảo giác”. Công cụ không có ý định gì cả; nó tạo ra nội dung trông hợp lý theo mẫu. Vì vậy mọi trích dẫn đều cần mở văn bản gốc để kiểm tra.',
    'Nói AI “hiểu”, “quan tâm”, “suy nghĩ” là nhân hoá AI và dễ khiến học sinh tin tuyệt đối vào kết quả. Mô tả đúng: công cụ tạo ra nội dung dựa trên dữ liệu.'
  ]);

  perform pg_temp.buoc(s, 2, 'Tổng kết học phần 1', 'end', 1, jsonb_build_object('message',
    'Bạn đã biết học máy tìm ra mẫu từ dữ liệu, và AI tạo sinh tạo câu trả lời bằng cách dự đoán, nên câu trả lời có thể sai. Học phần 2 áp dụng điều này khi soạn bài: giao việc rõ ràng, kiểm chứng kết quả và giữ an toàn dữ liệu học sinh.'));

  -- ============================================================ Học phần 2
  insert into public.course_modules (course_id, position, title)
  values (c, 1, 'Dùng AI tạo sinh có trách nhiệm khi soạn bài') returning id into m;

  insert into public.course_sections (module_id, position, title) values (m, 0, 'Giao việc và kiểm chứng') returning id into s;

  perform pg_temp.buoc(s, 0, 'Viết yêu cầu rõ ràng', 'doc', 6, jsonb_build_object('text', $t$## Một yêu cầu tốt có gì
Công cụ AI chỉ dựa vào những gì bạn viết. Yêu cầu càng rõ, bản nháp càng gần với điều bạn cần. Một yêu cầu tốt thường có:
- **Bối cảnh:** lớp, môn, bài, yêu cầu cần đạt.
- **Việc cần làm:** soạn câu hỏi, gợi ý hoạt động, viết lại cho dễ hiểu…
- **Định dạng:** số câu, độ dài, bảng hay danh sách, có kèm đáp án không.
- **Giới hạn:** thời lượng, thiết bị lớp có, điều cần tránh.

## Ví dụ
Chưa rõ: *Làm bài tập phân số.*

Rõ hơn: *Soạn 5 câu trắc nghiệm về so sánh phân số cho học sinh lớp 4, mỗi câu 4 lựa chọn, kèm đáp án và một câu giải thích ngắn. Dùng ví dụ chia bánh, chia kẹo quen thuộc với học sinh.*

## Sửa dần, không làm lại từ đầu
Kết quả chưa ổn thì nói rõ điều chưa đạt, ví dụ: “câu 3 quá khó, đổi sang phân số có mẫu số nhỏ hơn 10”. Sửa vài lượt thường nhanh hơn viết lại yêu cầu từ đầu.

[Gợi ý khi dạy] Lưu những yêu cầu dùng tốt thành một danh sách riêng; lần sau chỉ cần thay tên bài và yêu cầu cần đạt.$t$));

  perform pg_temp.buoc(s, 1, 'Kiểm chứng và bảo vệ dữ liệu học sinh', 'doc', 6, jsonb_build_object('text', $t$## Kiểm chứng trước khi dùng
Bạn là người chịu trách nhiệm về nội dung đưa vào lớp. Trước khi dùng bản nháp do AI tạo, hãy kiểm tra:
1. **Kiến thức:** đối chiếu với sách giáo khoa và tài liệu chính thức.
2. **Trích dẫn:** mở văn bản gốc để kiểm tra số hiệu, ngày ban hành và nội dung. Hỏi lại chính công cụ đó không phải là kiểm chứng.
3. **Mức độ phù hợp:** độ khó, thời lượng, ví dụ có gần với học sinh của bạn không.
4. **Định kiến:** nội dung có định kiến về giới, vùng miền hay dân tộc không.

## Bảo vệ dữ liệu học sinh
Nội dung bạn gửi vào công cụ AI có thể được lưu ở máy chủ bên ngoài trường. Không đưa vào:
- Họ tên, ảnh, số điện thoại, địa chỉ của học sinh và phụ huynh.
- Điểm số, nhận xét, tình trạng sức khoẻ, hoàn cảnh gia đình của từng em.

Cần ví dụ thì dùng tên giả hoặc mô tả chung, như “một học sinh hay quên làm bài tập”.

[Tránh] Dán nguyên bảng điểm hay danh sách lớp vào công cụ AI để nhờ viết nhận xét.$t$));

  insert into public.course_sections (module_id, position, title) values (m, 1, 'Thực hành') returning id into s;

  l := pg_temp.buoc(s, 0, 'Kiểm tra nhanh: dùng AI khi soạn bài', 'quiz', 5, jsonb_build_object('questions', jsonb_build_array(
    jsonb_build_object('text', 'Yêu cầu nào giúp công cụ AI tạo ra bài luyện tập dùng được nhất?', 'options', jsonb_build_array(
      'Làm bài tập toán.',
      'Viết gì đó hay về phân số.',
      'Soạn 5 câu trắc nghiệm về so sánh phân số cho lớp 4, mỗi câu 4 lựa chọn, kèm đáp án, dùng ví dụ quen thuộc với học sinh.')),
    jsonb_build_object('text', 'Thông tin nào không nên đưa vào công cụ AI?', 'options', jsonb_build_array(
      'Tên bài học và yêu cầu cần đạt trong chương trình',
      'Họ tên, điểm số và hoàn cảnh gia đình của từng học sinh',
      'Số tiết và hình thức tổ chức lớp')),
    jsonb_build_object('text', 'AI tạo sinh trả lời kèm trích dẫn một văn bản pháp quy. Trước khi đưa vào kế hoạch bài dạy, bạn nên làm gì?', 'options', jsonb_build_array(
      'Giữ nguyên vì công cụ đã ghi rõ số hiệu',
      'Hỏi lại cùng công cụ đó xem có chắc không; nếu nó nói chắc thì dùng',
      'Mở văn bản gốc trên nguồn chính thức để kiểm tra số hiệu, ngày và nội dung')),
    jsonb_build_object('text', 'Khi giáo viên dùng AI hỗ trợ soạn bài, ai chịu trách nhiệm về nội dung đưa vào lớp?', 'options', jsonb_build_array(
      'Giáo viên: công cụ chỉ tạo bản nháp, giáo viên đọc, sửa và quyết định',
      'Công ty làm ra công cụ AI',
      'Không ai, vì nội dung do máy tạo')),
    jsonb_build_object('text', 'Bản nháp AI tạo chưa hợp với lớp của bạn (quá khó, ví dụ xa lạ). Nên làm gì?', 'options', jsonb_build_array(
      'Bỏ hẳn, vì AI không dùng được cho lớp mình',
      'Dùng nguyên bản nháp cho nhanh',
      'Nói rõ điều chưa đạt và yêu cầu sửa, ví dụ giảm độ khó, đổi sang ví dụ học sinh gặp hằng ngày'))
  )));
  insert into public.quiz_keys (lesson_id, answers, explains) values (l, array[2, 1, 2, 0, 2], array[
    'Yêu cầu tốt nêu rõ bối cảnh (lớp 4, so sánh phân số), việc cần làm, định dạng (5 câu, 4 lựa chọn, có đáp án) và giới hạn (ví dụ quen thuộc). Hai yêu cầu kia quá chung nên bản nháp khó dùng.',
    'Thông tin định danh và thông tin riêng của học sinh không đưa vào công cụ AI. Tên bài, yêu cầu cần đạt, số tiết là thông tin chương trình, dùng được.',
    'Hỏi lại chính công cụ đó không phải kiểm chứng: nó có thể tiếp tục tạo ra câu trả lời sai trông như thật. Chỉ văn bản gốc trên nguồn chính thức mới xác nhận được.',
    'Công cụ AI chỉ hỗ trợ tạo bản nháp. Giáo viên là người đọc, sửa, quyết định dùng gì và chịu trách nhiệm về nội dung trong lớp.',
    'Sửa dần bằng cách nói rõ điều chưa đạt thường nhanh hơn bỏ đi hay viết lại từ đầu, và tốt hơn dùng nguyên bản chưa phù hợp.'
  ]);

  perform pg_temp.buoc(s, 1, 'Thử với bài dạy của bạn', 'reflect', 8, jsonb_build_object(
    'prompt', 'Chọn một bài bạn sắp dạy. Viết một yêu cầu bạn sẽ gửi cho công cụ AI để hỗ trợ soạn một phần của bài (hoạt động khởi động, câu hỏi, bài luyện tập…). Sau đó ghi hai điều bạn sẽ kiểm tra lại trước khi dùng kết quả trong lớp.',
    'hints', $t$- Ghi rõ lớp, bài và yêu cầu cần đạt
- Nêu định dạng bạn muốn nhận
- Không ghi tên hay thông tin riêng của học sinh$t$,
    'allow_link', false));

  perform pg_temp.buoc(s, 2, 'Tổng kết khoá', 'end', 1, jsonb_build_object('message',
    'Cảm ơn bạn đã học thử. Quay lại trang khoá học và bấm Nhận giấy chứng nhận để xác nhận họ tên và tải giấy. Có góp ý về nội dung hay cách dùng web, bạn gửi cho AI Edu để chúng tôi hoàn thiện.'));
end $seed$;

-- Xuất bản. courses_guard chỉ cho quản lý nội dung xuất bản (file chạy bằng tài khoản database, không có vai trò), nên tắt
-- trigger riêng cho câu cập nhật này; điều kiện của nút Xuất bản được kiểm lại ngay trước đó bằng course_problems().
-- Tài khoản không được đặt session_replication_role (vd. chạy SQL qua công cụ quản trị Supabase) thì xuất bản bằng nút Xuất bản
-- trong khu nội bộ. Trên project, khoá được xuất bản ngày 27/11 bằng tài khoản quản trị của Midu, qua đủ kiểm tra của courses_guard.
do $pub$
declare
  c uuid;
  p text[];
begin
  select id into c from public.courses
  where slug = 'trai-nghiem-ai-tao-sinh' and status = 'draft' and published_at is null and not is_demo;
  if c is null then
    return;
  end if;
  p := public.course_problems(c);
  if cardinality(p) > 0 then
    raise exception 'Khoá trải nghiệm chưa xuất bản được: %', array_to_string(p, ' ');
  end if;
  perform set_config('session_replication_role', 'replica', true);
  update public.courses set status = 'published', published_at = now(), updated_at = now() where id = c;
  perform set_config('session_replication_role', 'origin', true);
end $pub$;

commit;
