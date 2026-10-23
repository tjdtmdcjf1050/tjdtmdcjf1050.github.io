/* eslint-disable @next/next/no-html-link-for-pages -- plain anchors avoid a Vinext hydration conflict in this hosted runtime */
import { getChatGPTUser } from "./chatgpt-auth";
import CommunityHeader from "./components/CommunityHeader";
import HomeDiscoveryClient from "./components/HomeDiscoveryClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return (
    <>
      <a className="skip-link" href="#main-content">
        본문 바로가기
      </a>

      <CommunityHeader user={user} />

      <main className="home-page" id="main-content">
        <aside className="public-test-banner" aria-label="베타 서비스 안내">베타 서비스 · 작품 탐색은 누구나, 글쓰기와 내 공간은 가입 없이 체험하거나 계정을 만들어 이용할 수 있습니다.</aside>
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow reveal">작가와 독자가 함께 만드는 출판 플랫폼</p>
              <h1 className="reveal" id="hero-title">
                쓰고, 읽고,
                <br /><em>함께 책으로</em> 키웁니다.
              </h1>
              <p className="hero-description reveal">
                GROW BOOK은 누구나 작품을 연재하고, 독자는 읽기·추천·구매희망으로
                출판 가능성을 키우는 참여형 전자책 커뮤니티입니다. 선택받은 작품은
                검토와 편집을 거쳐 실제 책이 될 수 있습니다.
              </p>

              <div className="hero-actions reveal">
                <a className="button button-primary" href="/community">
                  작품 둘러보기
                </a>
                <a className="button home-trial-button" href="/login">
                  가입 없이 체험하기
                </a>
              </div>

              <ul className="hero-points reveal" aria-label="GROW BOOK에서 할 수 있는 일">
                <li>
                  <strong>작가</strong>
                  <span>쓰고 연재하기</span>
                </li>
                <li>
                  <strong>독자</strong>
                  <span>읽고 발견하기</span>
                </li>
                <li>
                  <strong>출판</strong>
                  <span>함께 가능성 키우기</span>
                </li>
              </ul>
            </div>

            <aside className="home-purpose-panel reveal" aria-label="GROW BOOK 이용 흐름">
              <p>GROW BOOK이 하는 일</p>
              <ol>
                <li>
                  <span>01</span>
                  <div><strong>작품을 씁니다</strong><small>초안 저장부터 연재·예약 발행까지</small></div>
                </li>
                <li>
                  <span>02</span>
                  <div><strong>독자가 읽고 반응합니다</strong><small>좋아요·추천·완독·구매희망을 한눈에</small></div>
                </li>
                <li>
                  <span>03</span>
                  <div><strong>출판 가능성을 확인합니다</strong><small>공개된 기준과 운영진 검토로 후보 선정</small></div>
                </li>
                <li>
                  <span>04</span>
                  <div><strong>한 권의 책으로 만납니다</strong><small>편집·디자인·제작을 거쳐 실제 출간</small></div>
                </li>
              </ol>
              <a href="#journey">출판 과정 자세히 보기 <span aria-hidden="true">↓</span></a>
            </aside>
          </div>
        </section>

        <HomeDiscoveryClient />

        <section className="values-section" id="values" aria-labelledby="values-title">
          <div className="container values-grid">
            <div className="section-heading values-heading">
              <p className="eyebrow">WHY GROW BOOK</p>
              <h2 id="values-title">
                좋은 글이
                <br />
                <em>혼자 머물지 않도록.</em>
              </h2>
              <p>
                작품의 가능성을 소수의 심사가 아닌 독자의 진짜 반응으로
                발견합니다. 쓰는 사람과 읽는 사람이 함께 책의 시작을
                만듭니다.
              </p>
            </div>

            <ol className="value-list">
              <li>
                <span className="value-number">01</span>
                <div>
                  <h3>누구에게나 열린 시작</h3>
                  <p>
                    장르와 분량의 부담 없이 한 문장부터 연재까지, 나만의
                    속도로 이야기를 시작합니다.
                  </p>
                </div>
                <span className="value-symbol" aria-hidden="true">✦</span>
              </li>
              <li>
                <span className="value-number">02</span>
                <div>
                  <h3>독자의 반응이 만드는 기회</h3>
                  <p>
                    좋아요와 구매 의사로 숨은 가능성을 발견하고, 카테고리별
                    사랑받는 작품을 함께 선택합니다.
                  </p>
                </div>
                <span className="value-symbol" aria-hidden="true">↗</span>
              </li>
              <li>
                <span className="value-number">03</span>
                <div>
                  <h3>온라인을 넘어 실제 출판으로</h3>
                  <p>
                    독자의 선택을 받은 이야기는 편집과 제작을 거쳐 실물
                    도서로 출간되고 더 넓은 세상과 만납니다.
                  </p>
                </div>
                <span className="value-symbol" aria-hidden="true">▰</span>
              </li>
            </ol>
          </div>

          <div className="marquee" aria-hidden="true">
            <div className="marquee-inner">
              <div className="marquee-track">
                <span>WRITE YOUR STORY</span>
                <i>✦</i>
                <span>MEET YOUR READERS</span>
                <i>✦</i>
                <span>GROW INTO A BOOK</span>
                <i>✦</i>
              </div>
              <div className="marquee-track">
                <span>WRITE YOUR STORY</span>
                <i>✦</i>
                <span>MEET YOUR READERS</span>
                <i>✦</i>
                <span>GROW INTO A BOOK</span>
                <i>✦</i>
              </div>
            </div>
          </div>
        </section>

        <section className="journey-section" id="journey" aria-labelledby="journey-title">
          <div className="container">
            <div className="section-heading journey-heading">
              <p className="eyebrow">HOW IT GROWS</p>
              <h2 id="journey-title">당신의 글이 책이 되는 4개의 장면</h2>
              <p>
                쓰는 순간부터 출간되는 날까지, GROW BOOK이 독자와 작가를
                하나의 여정으로 연결합니다.
              </p>
            </div>

            <div className="journey-experience">
              <div className="journey-step-navigation">
                <div className="journey-shelf-heading">
                  <p>4 STEP BOOKSHELF</p>
                  <strong id="journey-shelf-title">
                    책등을 눌러 다음 장면 보기
                  </strong>
                  <span id="journey-shelf-help">
                    01부터 04까지 모두 선택할 수 있어요.
                  </span>
                </div>
                <div
                  className="journey-tabs"
                  role="tablist"
                  aria-labelledby="journey-shelf-title"
                  aria-describedby="journey-shelf-help"
                >
                <button
                  type="button"
                  role="tab"
                  aria-selected="true"
                  aria-controls="journey-panel"
                  id="journey-tab-1"
                  tabIndex={0}
                  data-journey-step
                  data-step="01"
                  data-kicker="WRITE"
                  data-title="자유롭게 쓰기"
                  data-description="오늘 떠오른 한 문장, 오래 품어온 소설, 나누고 싶은 에세이를 원하는 카테고리에 자유롭게 기록하세요."
                  data-meta="첫 문장부터 연재까지"
                >
                  <span>01</span>
                  <span>
                    <strong>자유롭게 쓰기</strong>
                    <small>나만의 이야기를 시작해요</small>
                  </span>
                  <i aria-hidden="true">→</i>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected="false"
                  aria-controls="journey-panel"
                  id="journey-tab-2"
                  tabIndex={-1}
                  data-journey-step
                  data-step="02"
                  data-kicker="CONNECT"
                  data-title="독자와 연결하기"
                  data-description="작품을 공개하면 독자가 읽고 공감하며 좋아요와 구매 의사를 남깁니다. 진짜 반응이 작품의 다음 가능성이 됩니다."
                  data-meta="공감 · 피드백 · 구매 의사"
                >
                  <span>02</span>
                  <span>
                    <strong>독자와 연결하기</strong>
                    <small>공감과 피드백을 만나요</small>
                  </span>
                  <i aria-hidden="true">→</i>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected="false"
                  aria-controls="journey-panel"
                  id="journey-tab-3"
                  tabIndex={-1}
                  data-journey-step
                  data-step="03"
                  data-kicker="CHOOSE"
                  data-title="가능성을 선택하기"
                  data-description="카테고리별 독자 추천 1위 작품을 발견합니다. 숫자뿐 아니라 지속적인 관심과 구매 의사를 함께 살펴봅니다."
                  data-meta="카테고리별 TOP 1"
                >
                  <span>03</span>
                  <span>
                    <strong>가능성을 선택하기</strong>
                    <small>독자가 다음 작가를 발견해요</small>
                  </span>
                  <i aria-hidden="true">→</i>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected="false"
                  aria-controls="journey-panel"
                  id="journey-tab-4"
                  tabIndex={-1}
                  data-journey-step
                  data-step="04"
                  data-kicker="PUBLISH"
                  data-title="세상에 출간하기"
                  data-description="선정된 작품은 전문 편집과 디자인, 제작 과정을 거쳐 한 권의 실물 도서가 되어 독자와 다시 만납니다."
                  data-meta="편집 · 디자인 · 실물 도서"
                >
                  <span>04</span>
                  <span>
                    <strong>세상에 출간하기</strong>
                    <small>한 권의 책으로 완성해요</small>
                  </span>
                  <i aria-hidden="true">→</i>
                  </button>
                </div>
              </div>

              <article
                className="journey-panel"
                id="journey-panel"
                role="tabpanel"
                aria-live="polite"
                aria-labelledby="journey-tab-1"
                data-active-step="01"
                data-journey-panel
              >
                <div className="panel-topline">
                  <span data-panel-step>01</span>
                  <span data-panel-kicker>WRITE</span>
                </div>
                <div className="panel-content">
                  <p className="panel-label">YOUR NEXT SCENE</p>
                  <h3 data-panel-title>자유롭게 쓰기</h3>
                  <p data-panel-description>
                    오늘 떠오른 한 문장, 오래 품어온 소설, 나누고 싶은
                    에세이를 원하는 카테고리에 자유롭게 기록하세요.
                  </p>
                  <span className="panel-meta" data-panel-meta>
                    첫 문장부터 연재까지
                  </span>
                </div>
                <div className="panel-pages" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            </div>

            <div className="journey-summary" aria-label="GROW BOOK 전체 흐름 요약">
              <span>작가의 시작</span>
              <i aria-hidden="true" />
              <span>독자의 발견</span>
              <i aria-hidden="true" />
              <span>함께하는 선택</span>
              <i aria-hidden="true" />
              <span>세상에 출간</span>
            </div>
          </div>
        </section>

        <section className="impact-section" id="impact" aria-labelledby="impact-title">
          <div className="container impact-grid">
            <div className="impact-art" aria-hidden="true">
              <div className="heart-word">愛</div>
              <div className="impact-book impact-book-one">
                <span>01</span>
                <strong>LOVE</strong>
              </div>
              <div className="impact-book impact-book-two">
                <span>∞</span>
                <strong>TOGETHER</strong>
              </div>
              <p>Stories grow further when shared.</p>
            </div>

            <div className="section-heading impact-copy">
              <p className="eyebrow">GROW TOGETHER</p>
              <h2 id="impact-title">
                이야기가 모여
                <br />
                <em>더 큰 변화를 만듭니다.</em>
              </h2>
              <p>
                ‘사랑’을 주제로 가장 많은 공감을 받은 글들을 한 권의
                앤솔로지로 엮습니다. 책을 통해 만들어진 수익은 도움이 필요한
                곳에 나누며, 한 사람의 문장이 우리 모두의 변화로 이어집니다.
              </p>

              <ul className="impact-points">
                <li>
                  <span aria-hidden="true">01</span>
                  독자의 공감으로 선정
                </li>
                <li>
                  <span aria-hidden="true">02</span>
                  하나의 주제로 공동 출간
                </li>
                <li>
                  <span aria-hidden="true">03</span>
                  수익을 사회에 환원
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="cta-section" id="start" aria-labelledby="cta-title">
          <div className="container cta-inner">
            <p className="eyebrow">YOUR STORY STARTS HERE</p>
            <h2 id="cta-title">
              아직 쓰이지 않은 이야기가
              <br />
              당신을 기다리고 있어요.
            </h2>
            <p>
              첫 문장을 쓰는 작가로, 새로운 가능성을 발견하는 독자로.
              <br />
              GROW BOOK에서 함께 시작하세요.
            </p>

            <div className="cta-actions">
              <a className="button button-light" href="/write">
                글쓰기 시작하기 <span aria-hidden="true">→</span>
              </a>
              <a className="button button-outline-light" href="/studio">
                내 공간 보기 <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <p className="cta-watermark" aria-hidden="true">GROW</p>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <a className="brand footer-brand" href="#top" aria-label="GROW BOOK 홈">
            <span className="brand-mark" aria-hidden="true">G</span>
            <span>GROW BOOK</span>
          </a>
          <p>Write together. Grow further.</p>
          <a href="#top">맨 위로 <span aria-hidden="true">↑</span></a>
        </div>
      </footer>

      <script src="/script.js" defer />
    </>
  );
}
