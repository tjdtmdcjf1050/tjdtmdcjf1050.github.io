INSERT OR IGNORE INTO `categories` (`owner_email`,`name`,`slug`,`color`) VALUES
('guest@growbook.test','소설','novel','#ff835c'),
('guest@growbook.test','에세이','essay','#d9ff54'),
('guest@growbook.test','시','poetry','#a9c9b3'),
('guest@growbook.test','사랑','love','#ffb3a0');
--> statement-breakpoint
INSERT OR IGNORE INTO `profiles` (`email`,`display_name`,`bio`,`interests`,`headline`,`portfolio_public`) VALUES
('guest@growbook.test','테스트 작가','서로 다른 주제의 문장을 쓰고 독자의 반응으로 한 권의 가능성을 키웁니다.','사랑, 성장, 위로, 청춘, 철학, 지식','한 장씩 이야기를 키우는 GROW BOOK 테스트 작가',1);
--> statement-breakpoint
WITH `seed` (`title`,`summary`,`body`,`topic_slug`,`format`,`category_name`,`author_name`,`published_at`) AS (VALUES
('마음을 건네는 방식','말보다 먼저 도착하는 다정한 행동에 관한 산문.','따뜻한 컵 하나가 차가운 하루를 바꾸었다. 사랑은 거창한 약속보다 오늘을 살피는 작은 대답에 가까웠다.','love','prose','사랑','다온','2026-07-14T09:00:00.000Z'),
('우리 사이의 계절','서로 다른 속도로 자란 두 사람이 다시 만나는 이야기.','오랜만에 받은 안부 한 줄이 멈춰 있던 마음의 계절을 다시 움직였다. 우리는 같은 그늘 아래 천천히 걸었다.','love','novel','소설','서윤','2026-07-13T09:00:00.000Z'),
('오래 남는 다정함','일상에 남아 있는 사랑의 흔적을 기록한 에세이.','힘들 때마다 떠오르는 것은 특별한 말이 아니라 괜찮냐고 묻던 목소리였다. 그 다정함은 오래 빛났다.','love','essay','사랑','하람','2026-07-12T09:00:00.000Z'),
('천천히 가도 괜찮은 날','속도를 늦추고 비로소 발견한 일상의 표정.','평소보다 십 분 일찍 집을 나서니 늘 지나치던 빵집의 따뜻한 냄새가 느껴졌다. 나만의 속도가 보였다.','growth','essay','에세이','소담','2026-07-11T09:00:00.000Z'),
('작은 습관이 남긴 것','하루 한 줄 기록이 삶을 바꾸기 시작한 과정.','잠들기 전 오늘 고마웠던 일을 한 줄씩 적었다. 백 개의 문장 안에는 평범한 하루의 충분한 빛이 있었다.','growth','essay','에세이','지우','2026-07-10T09:00:00.000Z'),
('실패를 접어 둔 서랍','넘어짐을 다음 시도의 재료로 바꾸는 기록.','실패를 숨기던 서랍을 열어 하나씩 이름 붙였다. 부끄러움이었던 장면은 다음 선택을 알려 주는 지도가 되었다.','growth','prose','에세이','연우','2026-07-09T09:00:00.000Z'),
('새벽에게 보내는 편지','잠들지 못한 시간에 건네는 조용한 위로.','불 꺼진 창문 사이 나의 작은 숨만 별처럼 남아 있다. 조금 늦어도 오늘의 빛은 반드시 도착한다.','comfort','poetry','시','나래','2026-07-08T09:00:00.000Z'),
('마음이 쉬어 가는 의자','지친 날 잠시 멈추는 법에 관한 에세이.','공원 끝 빈 의자에 앉아 아무것도 하지 않았다. 쉬는 일은 포기가 아니라 다시 걸을 힘을 모으는 일이었다.','comfort','essay','에세이','온유','2026-07-07T09:00:00.000Z'),
('괜찮지 않아도 되는 밤','솔직한 마음을 인정하며 시작된 회복.','괜찮다는 말을 내려놓자 비로소 숨이 편해졌다. 오늘만큼은 슬픔도 내 마음의 손님으로 맞아 주기로 했다.','comfort','prose','에세이','해솔','2026-07-06T09:00:00.000Z'),
('열두 번째 승강장','지도에 없는 승강장에서 시작되는 특별한 귀가.','막차를 놓친 민호 앞에 숫자 12가 적힌 승강장이 불을 밝혔다. 표에는 가장 그리운 순간을 적으라고 쓰여 있었다.','youth','novel','소설','민호','2026-07-05T09:00:00.000Z'),
('우리의 첫 퇴사일기','불안 속에서도 자기 길을 만드는 청춘의 기록.','회사를 나온 첫날 우리는 작은 카페에서 각자의 다음 장을 썼다. 두려움 옆에는 오래 미뤄 둔 기대도 앉아 있었다.','youth','essay','에세이','유진','2026-07-04T09:00:00.000Z'),
('종이별을 접는 밤','매일 밤 소원을 적는 작은 마을의 따뜻한 판타지.','골목 끝 가게에서는 이루지 못한 소원을 종이별과 바꿔 주었다. 하나는 친구의 이름을 조심스럽게 적었다.','youth','novel','소설','하나','2026-07-03T09:00:00.000Z'),
('좋은 삶은 무엇으로 남는가','일상의 선택에서 삶의 기준을 묻는 철학 에세이.','남들보다 앞선 하루보다 내 마음에 부끄럽지 않은 하루를 선택했다. 좋은 삶은 반복하는 태도 속에 남았다.','life-philosophy','essay','에세이','현','2026-07-02T09:00:00.000Z'),
('질문을 품고 걷는 사람','정답보다 오래 남는 질문에 관한 산문.','빠른 답을 찾는 대신 질문과 함께 걸었다. 이해하지 못한 시간을 견디는 동안 나의 세계는 조금 넓어졌다.','life-philosophy','prose','에세이','이든','2026-07-01T09:00:00.000Z'),
('오늘의 선택이 나를 만든다','작은 결정과 책임에 관한 사색.','운명처럼 보였던 일들도 돌아보면 수많은 선택의 합이었다. 나는 오늘의 태도로 내일의 나를 천천히 만들고 있었다.','life-philosophy','essay','에세이','윤','2026-06-30T09:00:00.000Z'),
('월급의 흐름을 바꾸는 첫 기록','복잡한 돈 관리를 한 장으로 시작하는 방법.','한 달 지출을 필요와 습관으로 나눠 적었다. 숫자를 피하지 않자 돈은 불안이 아니라 선택을 돕는 정보가 되었다.','knowledge-economy','essay','에세이','도경','2026-06-29T09:00:00.000Z'),
('작게 시작하는 1인 사업','아이디어를 검증 가능한 일로 바꾸는 실전 기록.','완벽한 계획 대신 한 사람의 문제를 해결하는 작은 서비스를 만들었다. 첫 고객의 질문이 다음 제품의 방향이 되었다.','knowledge-economy','prose','에세이','준','2026-06-28T09:00:00.000Z'),
('집중력을 설계하는 시간','의지보다 환경으로 몰입을 만드는 방법.','해야 할 일을 한 문장으로 줄이고 알림을 닫았다. 집중은 참는 힘이 아니라 방해를 미리 덜어 내는 설계였다.','knowledge-economy','essay','에세이','아인','2026-06-27T09:00:00.000Z')
)
INSERT INTO `posts` (`owner_email`,`author_name`,`category_id`,`topic_id`,`format`,`work_status`,`visibility`,`publish_challenge`,`sponsorship_enabled`,`comments_enabled`,`purchase_goal`,`title`,`summary`,`tags`,`series_title`,`font_family`,`font_size`,`line_height`,`content`,`status`,`published_at`,`created_at`,`updated_at`)
SELECT 'guest@growbook.test', `author_name`,
  (SELECT `id` FROM `categories` WHERE `owner_email`='guest@growbook.test' AND `name`=`category_name`),
  (SELECT `id` FROM `topics` WHERE `slug`=`topic_slug`),
  `format`, 'completed', 'public', 1, 1, 1, 300, `title`, `summary`, `topic_slug` || ', 테스트 작품', 'GROW BOOK 공개 테스트',
  CASE WHEN `format`='poetry' THEN 'serif' ELSE 'classic' END, 18, 190, `body`, 'published', `published_at`, `published_at`, `published_at`
FROM `seed`
WHERE NOT EXISTS (SELECT 1 FROM `posts` WHERE `posts`.`title`=`seed`.`title`);
--> statement-breakpoint
INSERT OR IGNORE INTO `publication_candidates` (`post_id`,`status`,`score`)
SELECT `id`,'challenging',0 FROM `posts` WHERE `publish_challenge`=1;
--> statement-breakpoint
INSERT OR IGNORE INTO `challenge_entries` (`challenge_id`,`post_id`,`applicant_email`,`status`)
SELECT (SELECT `id` FROM `challenges` WHERE `slug`='love-anthology-2026'), `posts`.`id`, `owner_email`, 'submitted'
FROM `posts` INNER JOIN `topics` ON `posts`.`topic_id`=`topics`.`id`
WHERE `topics`.`slug`='love' AND `posts`.`publish_challenge`=1;
--> statement-breakpoint
INSERT OR IGNORE INTO `post_reactions` (`post_id`,`user_email`,`type`)
SELECT `id`,'demo-reader-one@growbook.test','like' FROM `posts` WHERE `series_title`='GROW BOOK 공개 테스트';
--> statement-breakpoint
INSERT OR IGNORE INTO `post_reactions` (`post_id`,`user_email`,`type`)
SELECT `id`,'demo-reader-two@growbook.test','purchase' FROM `posts` WHERE `series_title`='GROW BOOK 공개 테스트';
--> statement-breakpoint
INSERT OR IGNORE INTO `post_reactions` (`post_id`,`user_email`,`type`)
SELECT `id`,'demo-reader-three@growbook.test','recommend' FROM `posts` WHERE `series_title`='GROW BOOK 공개 테스트' AND (`id` % 3) != 0;
--> statement-breakpoint
INSERT OR IGNORE INTO `post_reactions` (`post_id`,`user_email`,`type`)
SELECT `id`,'demo-reader-four@growbook.test','purchase' FROM `posts` WHERE `series_title`='GROW BOOK 공개 테스트' AND (`id` % 2) = 1;
--> statement-breakpoint
INSERT OR IGNORE INTO `reading_progress` (`post_id`,`user_email`,`chapter_index`,`progress_percent`,`completed`)
SELECT `id`,'demo-reader-five@growbook.test',0,100,1 FROM `posts` WHERE `series_title`='GROW BOOK 공개 테스트' AND (`id` % 2) = 0;
--> statement-breakpoint
INSERT OR IGNORE INTO `sponsorships` (`post_id`,`user_email`,`amount`,`message`)
SELECT `id`,'demo-reader-six@growbook.test',10000,'출간을 응원합니다.' FROM `posts` WHERE `series_title`='GROW BOOK 공개 테스트' AND (`id` % 4) = 1;
