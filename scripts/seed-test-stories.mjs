const baseUrl = (process.env.GROWBOOK_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const separator = "\n\n<!-- GROWBOOK PAGE -->\n\n";
const page = (title, content) => `<!-- GROWBOOK TITLE:${encodeURIComponent(title)} -->\n${content}`;

const stories = {
  소설: [
    ["비가 멈춘 뒤의 도서관", "문을 닫은 도서관에서 발견된 한 권의 책과 낯선 메모에 관한 이야기.", "마지막 손님", "비가 그친 밤, 서윤은 반납함 안에서 자신의 이름이 적힌 낡은 책을 발견했다.", "책 속의 주소", "책갈피 뒤에는 사라진 골목의 주소와 내일 자정이라는 짧은 문장이 남아 있었다."],
    ["열두 번째 승강장", "지도에 없는 승강장에서 시작되는 아주 특별한 귀가 이야기.", "막차 이후", "막차를 놓친 민호 앞에 숫자 12가 적힌 낯선 승강장이 조용히 불을 밝혔다.", "돌아가는 표", "차장이 건넨 표에는 목적지 대신 가장 그리운 순간을 적으라고 쓰여 있었다."],
    ["종이별을 접는 밤", "매일 밤 종이별에 소원을 적는 작은 마을의 따뜻한 판타지.", "별을 모으는 가게", "골목 끝 가게에서는 이루지 못한 소원을 종이별 한 개와 바꿔 주었다.", "마지막 소원", "하나는 자신의 소원 대신 오래 아픈 친구의 이름을 조심스럽게 별 안에 적었다."],
  ],
  에세이: [
    ["천천히 가도 괜찮은 날", "속도를 늦추고 비로소 발견한 일상의 표정에 관한 기록.", "멈춰 본 아침", "평소보다 십 분 일찍 집을 나서니 늘 지나치던 빵집의 따뜻한 냄새가 느껴졌다.", "나만의 속도", "조금 늦더라도 주변을 바라볼 수 있는 속도가 지금의 나에게 가장 알맞았다."],
    ["작은 습관이 남긴 것", "하루 한 줄 기록이 삶을 바꾸기 시작한 과정.", "한 줄의 시작", "거창한 계획 대신 잠들기 전 오늘 고마웠던 일을 한 줄씩 적기 시작했다.", "쌓여 가는 마음", "백 개의 문장을 다시 읽으며 평범한 하루에도 충분한 빛이 있었다는 걸 알았다."],
    ["혼자 걷는 오후의 기록", "목적지 없이 걸으며 만난 도시와 마음의 작은 장면들.", "낯선 골목", "익숙한 길을 벗어나자 오래된 담장과 이름 모를 꽃이 새로운 지도를 만들어 주었다.", "돌아오는 길", "혼자 걷는 시간은 외로움이 아니라 내 마음의 목소리를 듣는 연습이었다."],
  ],
  시: [
    ["초록빛 문장", "새로운 시작을 닮은 짧은 시 모음.", "새싹", "작은 틈을 발견한 마음은\n끝내 초록빛 문장을 밀어 올린다.", "봄의 대답", "기다림 끝에 오는 것은\n언제나 어제와 다른 색의 대답."],
    ["새벽에게 보내는 편지", "잠들지 못한 시간에 건네는 조용한 위로.", "새벽 두 시", "불 꺼진 창문 사이\n나의 작은 숨만 별처럼 남아 있다.", "아침에게", "조금 늦어도 괜찮으니\n오늘의 빛을 잊지 말고 데려와 줘."],
    ["바람이 머문 자리", "지나간 계절과 남겨진 마음을 담은 시.", "빈 의자", "네가 떠난 자리에는\n바람이 앉아 오래도록 이름을 불렀다.", "계절의 끝", "낙엽 한 장이 돌아눕는 순간\n우리의 계절도 조용히 페이지를 넘겼다."],
  ],
  사랑: [
    ["마음을 건네는 방식", "말보다 먼저 도착하는 다정한 행동에 관한 이야기.", "따뜻한 컵", "그는 아무 말 없이 차가워진 내 손에 따뜻한 컵을 건넸다.", "작은 대답", "사랑은 거창한 약속보다 오늘을 살피는 작은 대답에 가까웠다."],
    ["우리 사이의 계절", "서로 다른 속도로 자란 두 사람이 다시 만나는 이야기.", "봄의 안부", "오랜만에 받은 안부 한 줄이 멈춰 있던 마음의 계절을 다시 움직였다.", "같은 여름", "우리는 달라진 시간을 설명하는 대신 같은 그늘 아래 천천히 걸었다."],
    ["오래 남는 다정함", "사라지지 않고 일상에 남아 있는 사랑의 흔적들.", "기억의 온도", "힘들 때마다 떠오르는 것은 특별한 말이 아니라 괜찮냐고 묻던 목소리였다.", "남겨진 빛", "누군가의 다정함은 시간이 지나도 마음 한편을 밝히는 작은 조명이 된다."],
  ],
};

async function json(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `${response.status} ${path}`);
  return data;
}

const { categories } = await json("/api/categories");
const { topics } = await json("/api/topics");
const { posts } = await json("/api/community?sort=recent");
const existingTitles = new Set(posts.map((post) => post.title));
let created = 0;

const topicForCategory = {
  소설: "youth",
  에세이: "growth",
  시: "comfort",
  사랑: "love",
};
const formatForCategory = { 소설: "novel", 에세이: "essay", 시: "poetry", 사랑: "prose" };

for (const category of categories) {
  const categoryStories = stories[category.name] || [];
  const topic = topics.find((item) => item.slug === topicForCategory[category.name]) || topics[0];
  for (const [title, summary, firstTitle, firstContent, secondTitle, secondContent] of categoryStories) {
    if (existingTitles.has(title)) continue;
    await json("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        summary,
        content: `${page(firstTitle, firstContent)}${separator}${page(secondTitle, secondContent)}`,
        categoryId: category.id,
        topicId: topic.id,
        format: formatForCategory[category.name] || "other",
        workStatus: "completed",
        visibility: "public",
        publishChallenge: category.name === "사랑",
        purchaseGoal: 300,
        sponsorshipEnabled: true,
        commentsEnabled: true,
        tags: `${category.name}, 테스트 작품`,
        seriesTitle: "GROW BOOK 공개 테스트",
        status: "published",
        fontFamily: category.name === "시" ? "serif" : "classic",
        fontSize: 18,
        lineHeight: 190,
      }),
    });
    created += 1;
  }
}

console.log(`Created ${created} test stories at ${baseUrl}.`);
